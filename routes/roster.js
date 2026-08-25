const crypto = require("crypto");
const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();

function stripAccents(s){
  return String(s == null ? "" : s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .trim().toUpperCase();
}

const ROSTER_FIELDS = ["numero", "ape1", "ape2", "nombre", "peloton", "sexo", "unidad", "dni", "telefono"];
const FOTO_MAX_BYTES = 400 * 1024; // dataURL incluido; una foto comprimida 320x320 ronda 20-40 KB
// El límite en el cliente es 4 MB de archivo original; en base64 (dataURL)
// eso pesa ~1.37×, así que el límite aquí tiene que ser mayor que 4 MB.
const ADJUNTO_MAX_BYTES = 6 * 1024 * 1024;
const ADJUNTOS_MAX_POR_ALUMNO = 20;

// Los campos "_foto", "_adjuntos", "_cuestionario" y "_cuestionarioFecha" NO
// se tocan nunca desde el reemplazo masivo del roster (subida de Excel /
// edición de campos de texto en la ficha): siempre se preservan tal cual
// estaban guardados en el servidor, y solo cambian a través de sus propias
// rutas (más abajo). Así, una foto o un adjunto que suba un instructor no
// puede perderse si el jefe de sección guarda el roster con una copia
// desactualizada en su navegador.
function sanitizeRosterRow(row, prev){
  const out = {};
  ROSTER_FIELDS.forEach(function (k){
    out[k] = row[k] == null ? "" : String(row[k]);
  });
  if (prev){
    if (prev._foto) out._foto = prev._foto;
    if (prev._adjuntos && prev._adjuntos.length) out._adjuntos = prev._adjuntos;
    if (prev._cuestionario) out._cuestionario = prev._cuestionario;
    if (prev._cuestionarioFecha) out._cuestionarioFecha = prev._cuestionarioFecha;
  }
  return out;
}

function findRow(req, numero){
  return req.db.roster.find(function (r){ return String(r.numero) === String(numero); });
}

// Convención CEFOT-2: en el número de protocolo del alumno, el 1er dígito
// indica la compañía (1-4) y el 2º dígito la sección (1-5). Se usa como
// aviso de seguridad al cargar un roster nuevo: si buena parte de los
// números no encajan con la sección de quien lo está cargando, es probable
// que se haya subido la hoja de otra sección por error.
function contarNumerosFueraDeSeccion(rows, compania, seccion){
  const prefijo = String(compania) + String(seccion);
  let total = 0, fuera = 0;
  rows.forEach(function (r){
    const raw = String(r.numero || "").trim();
    const m = /^([1-4])([1-5])\d+/.exec(raw);
    if (!m) return;
    total++;
    if (m[1] + m[2] !== prefijo) fuera++;
  });
  return { total: total, fuera: fuera };
}

// Roster completo: solo el jefe de sección (contiene DNI, teléfono, etc.)
router.get("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  res.json({
    roster: req.db.roster,
    rosterUpdatedAt: req.db.rosterUpdatedAt,
    rosterUpdatedBy: req.db.rosterUpdatedBy
  });
});

// Reemplaza el roster completo (tras cargar un Excel nuevo, o al guardar
// los campos de texto de una ficha). Solo el jefe de sección, y siempre
// dentro de su propia sección.
router.post("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const rows = Array.isArray(req.body.roster) ? req.body.roster : null;
  if (!rows){
    return res.status(400).json({ error: "Formato de roster inválido." });
  }
  const existingByNumero = {};
  req.db.roster.forEach(function (r){ existingByNumero[String(r.numero)] = r; });

  const nuevo = rows
    .map(function (r){ return sanitizeRosterRow(r, existingByNumero[String(r.numero)]); })
    .filter(function (r){ return r.numero; });

  const chequeo = contarNumerosFueraDeSeccion(nuevo, req.db.compania, req.db.seccion);

  req.db.roster = nuevo;
  req.db.rosterUpdatedAt = new Date().toISOString();
  req.db.rosterUpdatedBy = req.user.dni;
  db.save();

  const respuesta = { ok: true, total: req.db.roster.length, rosterUpdatedAt: req.db.rosterUpdatedAt };
  if (chequeo.total > 0 && chequeo.fuera > 0){
    respuesta.aviso = chequeo.fuera + " de " + chequeo.total + " número(s) de protocolo de esta hoja no corresponden a " +
      req.db.compania + "ª Compañía / Sección " + req.db.seccion + " — revisa que no sea el listado de otra sección.";
  }
  res.json(respuesta);
});

// Buscador limitado: para jefes de pelotón y jefe de sección. Solo devuelve
// lo justo para identificar al alumno en un parte — nunca DNI, teléfono, ni
// el resto de su ficha, historial o expedientes.
router.get("/buscar", auth.requireAuth, function (req, res){
  const q = stripAccents(req.query.q || "");
  let rows = req.db.roster;
  if (q){
    rows = rows.filter(function (r){
      const hay = stripAccents([r.numero, r.ape1, r.ape2, r.nombre].join(" "));
      return hay.indexOf(q) !== -1;
    });
  }
  const limited = rows.slice(0, 25).map(function (r){
    return { numero: r.numero, ape1: r.ape1, ape2: r.ape2, nombre: r.nombre, peloton: r.peloton };
  });
  res.json({ resultados: limited });
});

// Ficha básica de un alumno concreto: para el jefe de sección, o para un
// jefe de pelotón con permiso de "ver ficha", "hacer fotos" o "adjuntos"
// (necesita ver al menos lo justo para saber a quién le está haciendo la
// foto o adjuntando algo). El nivel de detalle depende de qué permisos
// tenga exactamente.
router.get("/:numero/ficha", auth.requireAuth, function (req, res){
  const row = findRow(req, req.params.numero);
  if (!row) return res.status(404).json({ error: "Alumno no encontrado." });

  const isAdmin = req.user.role === "admin";
  const user = isAdmin ? null : auth.getFreshUser(req);
  const permisos = isAdmin ? auth.normalizePermisos({ fotos: true, verFicha: true, adjuntos: true }) : auth.normalizePermisos(user && user.permisos);

  if (!isAdmin && !permisos.verFicha && !permisos.fotos && !permisos.adjuntos){
    return res.status(403).json({ error: "No tienes permiso para ver la ficha del alumno." });
  }

  const ficha = {
    numero: row.numero, ape1: row.ape1, ape2: row.ape2, nombre: row.nombre, peloton: row.peloton
  };
  if (isAdmin || permisos.fotos || permisos.verFicha){
    ficha.foto = row._foto || null;
  }
  if (isAdmin || permisos.verFicha){
    ficha.sexo = row.sexo || "";
    ficha.dni = row.dni || "";
    ficha.telefono = row.telefono || "";
    ficha.unidad = row.unidad || "";
  }
  if (isAdmin || permisos.adjuntos){
    ficha.adjuntos = (row._adjuntos || []).map(function (a){
      return {
        id: a.id, nombre: a.nombre, tipo: a.tipo, tamano: a.tamano, fecha: a.fecha,
        subidoPorMi: !!(a.subidoPor && a.subidoPor.dni === req.user.dni)
        // Nota: no se envía dataUrl aquí para no inflar la respuesta; se
        // descarga bajo demanda con GET /:numero/adjuntos/:id.
      };
    });
  }
  res.json({ ficha: ficha });
});

// Guarda (o borra, si foto === null) la foto de un alumno. Jefe de sección,
// o jefe de pelotón con el permiso "fotos".
router.patch("/:numero/foto", auth.requireAuth, auth.requirePermiso("fotos"), function (req, res){
  const row = findRow(req, req.params.numero);
  if (!row) return res.status(404).json({ error: "Alumno no encontrado." });

  const foto = req.body ? req.body.foto : undefined;
  if (foto === null || foto === ""){
    delete row._foto;
    db.save();
    return res.json({ ok: true, foto: null });
  }
  if (typeof foto !== "string" || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(foto)){
    return res.status(400).json({ error: "Foto no válida." });
  }
  if (foto.length > FOTO_MAX_BYTES){
    return res.status(400).json({ error: "La foto es demasiado grande." });
  }
  row._foto = foto;
  db.save();
  res.json({ ok: true, foto: row._foto });
});

// Añade un archivo adjunto a la ficha de un alumno. Jefe de sección, o jefe
// de pelotón con el permiso "adjuntos".
router.post("/:numero/adjuntos", auth.requireAuth, auth.requirePermiso("adjuntos"), function (req, res){
  const row = findRow(req, req.params.numero);
  if (!row) return res.status(404).json({ error: "Alumno no encontrado." });

  const b = req.body || {};
  const nombre = String(b.nombre || "").trim();
  const tipo = String(b.tipo || "");
  const dataUrl = String(b.dataUrl || "");
  const esValido = tipo === "application/pdf" || tipo.indexOf("image/") === 0;

  if (!nombre || !esValido){
    return res.status(400).json({ error: "El archivo debe ser un PDF o una imagen." });
  }
  if (!/^data:[^;]+;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > ADJUNTO_MAX_BYTES){
    return res.status(400).json({ error: "El archivo pesa demasiado o no es válido (máximo " + Math.floor(ADJUNTO_MAX_BYTES / (1024 * 1024)) + " MB aprox., contando la codificación)." });
  }
  row._adjuntos = row._adjuntos || [];
  if (row._adjuntos.length >= ADJUNTOS_MAX_POR_ALUMNO){
    return res.status(400).json({ error: "Este alumno ya tiene el máximo de " + ADJUNTOS_MAX_POR_ALUMNO + " archivos adjuntos." });
  }

  const entry = {
    id: crypto.randomUUID(),
    nombre: nombre,
    tipo: tipo,
    tamano: Number(b.tamano) || dataUrl.length,
    fecha: new Date().toISOString(),
    dataUrl: dataUrl,
    subidoPor: { dni: req.user.dni, nombre: req.user.nombre, role: req.user.role }
  };
  row._adjuntos.push(entry);
  db.save();
  res.status(201).json({ ok: true, adjunto: { id: entry.id, nombre: entry.nombre, tipo: entry.tipo, tamano: entry.tamano, fecha: entry.fecha } });
});

// Descarga un adjunto concreto (incluye el contenido en base64). Mismas
// reglas de acceso que la ficha básica.
router.get("/:numero/adjuntos/:id", auth.requireAuth, function (req, res){
  const row = findRow(req, req.params.numero);
  if (!row) return res.status(404).json({ error: "Alumno no encontrado." });

  const isAdmin = req.user.role === "admin";
  if (!isAdmin){
    const user = auth.getFreshUser(req);
    const permisos = auth.normalizePermisos(user && user.permisos);
    if (!permisos.adjuntos) return res.status(403).json({ error: "No tienes permiso para ver este archivo." });
  }
  const entry = (row._adjuntos || []).find(function (a){ return a.id === req.params.id; });
  if (!entry) return res.status(404).json({ error: "Archivo no encontrado." });
  res.json({ adjunto: entry });
});

// Elimina un adjunto. Jefe de sección siempre; un jefe de pelotón con
// permiso "adjuntos" solo puede eliminar los que él mismo subió.
router.delete("/:numero/adjuntos/:id", auth.requireAuth, auth.requirePermiso("adjuntos"), function (req, res){
  const row = findRow(req, req.params.numero);
  if (!row) return res.status(404).json({ error: "Alumno no encontrado." });

  const entry = (row._adjuntos || []).find(function (a){ return a.id === req.params.id; });
  if (!entry) return res.status(404).json({ error: "Archivo no encontrado." });

  const isAdmin = req.user.role === "admin";
  const esPropio = entry.subidoPor && entry.subidoPor.dni === req.user.dni;
  if (!isAdmin && !esPropio){
    return res.status(403).json({ error: "Solo puedes eliminar los archivos que tú mismo subiste." });
  }

  row._adjuntos = (row._adjuntos || []).filter(function (a){ return a.id !== req.params.id; });
  db.save();
  res.json({ ok: true });
});

module.exports = router;
