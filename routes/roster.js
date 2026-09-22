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
const FOTO_MAX_BYTES = 400 * 1024;
const ADJUNTO_MAX_BYTES = 6 * 1024 * 1024;
const ADJUNTOS_MAX_POR_ALUMNO = 20;

function sanitizeRosterRow(row, prev){
  const out = {};
  ROSTER_FIELDS.forEach(function (k){
    out[k] = row[k] == null ? "" : String(row[k]);
  });
  // Si el cliente solo tenía el DNI enmascarado, no pisar el valor real.
  if (auth.looksMaskedDni(out.dni) && prev && prev.dni) out.dni = prev.dni;
  if (prev){
    if (prev._foto) out._foto = prev._foto;
    if (prev._adjuntos && prev._adjuntos.length) out._adjuntos = prev._adjuntos;
    if (prev._cuestionario) out._cuestionario = prev._cuestionario;
    if (prev._cuestionarioFecha) out._cuestionarioFecha = prev._cuestionarioFecha;
  }
  return out;
}

// Busca primero entre los alumnos activos y, si no está, entre las bajas —
// así la ficha, el historial, la foto y los adjuntos de un alumno dado de
// baja se pueden seguir consultando sin tener que reincorporarlo antes.
function findRow(req, numero){
  const row = req.db.roster.find(function (r){ return String(r.numero) === String(numero); });
  if (row) return row;
  db.ensureRosterShape(req.db);
  return req.db.bajas.find(function (r){ return String(r.numero) === String(numero); });
}

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

function rosterParaCliente(req, rows){
  return (rows || []).map(function (r){
    const row = Object.assign({}, r);
    row.dni = auth.publicDni(req, r.dni);
    return row;
  });
}

router.get("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureRosterShape(req.db);
  res.json({
    roster: rosterParaCliente(req, req.db.roster),
    bajas: rosterParaCliente(req, req.db.bajas),
    rosterUpdatedAt: req.db.rosterUpdatedAt,
    rosterUpdatedBy: req.db.rosterUpdatedBy
  });
});

router.post("/", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
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

// Da de baja a un alumno: lo mueve de `roster` a `bajas` (no se borra nada
// de lo suyo — ficha, historial, rebajes, sanciones, refuerzos y
// actividades siguen intactos), y le añade la fecha de baja. Deja de
// aparecer en el roster activo, en los buscadores y en los recuentos.
router.patch("/:numero/baja", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  db.ensureRosterShape(req.db);
  const idx = req.db.roster.findIndex(function (r){ return String(r.numero) === String(req.params.numero); });
  if (idx === -1) return res.status(404).json({ error: "Alumno no encontrado en el roster activo." });

  const row = req.db.roster[idx];
  row._bajaFecha = new Date().toISOString().slice(0, 10);
  req.db.roster.splice(idx, 1);
  req.db.bajas.push(row);
  db.save();
  const out = Object.assign({}, row);
  out.dni = auth.publicDni(req, row.dni);
  res.json({ ok: true, row: out });
});

// Devuelve a la sección a un alumno que estaba dado de baja, con todo lo
// que tenía registrado (nunca se borró nada suyo).
router.patch("/:numero/reincorporar", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  db.ensureRosterShape(req.db);
  const idx = req.db.bajas.findIndex(function (r){ return String(r.numero) === String(req.params.numero); });
  if (idx === -1) return res.status(404).json({ error: "Alumno no encontrado en las bajas." });

  const row = req.db.bajas[idx];
  delete row._bajaFecha;
  req.db.bajas.splice(idx, 1);
  req.db.roster.push(row);
  req.db.roster.sort(function (a, b){
    return String(a.numero).localeCompare(String(b.numero), "es", { numeric: true });
  });
  db.save();
  const out = Object.assign({}, row);
  out.dni = auth.publicDni(req, row.dni);
  res.json({ ok: true, row: out });
});

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
    ficha.dni = auth.publicDni(req, row.dni);
    ficha.telefono = row.telefono || "";
    ficha.unidad = row.unidad || "";
  }
  if (isAdmin || permisos.adjuntos){
    ficha.adjuntos = (row._adjuntos || []).map(function (a){
      return {
        id: a.id, nombre: a.nombre, tipo: a.tipo, tamano: a.tamano, fecha: a.fecha,
        subidoPorMi: !!(a.subidoPor && a.subidoPor.dni === req.user.dni)
      };
    });
  }
  res.json({ ficha: ficha });
});

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
