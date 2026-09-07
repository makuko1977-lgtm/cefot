const express = require("express");
const crypto = require("crypto");
const db = require("../lib/db");
const auth = require("../lib/auth");
const catalog = require("../public/shared/catalog.js");

const router = express.Router();

function nextExpediente(req){
  req.db.expedienteCounter = (req.db.expedienteCounter || 0) + 1;
  return req.db.expedienteCounter;
}

function resolveAlumnos(req, numeros){
  const list = Array.isArray(numeros) ? numeros : [];
  const out = [];
  list.forEach(function (numero){
    const row = req.db.roster.find(function (r){ return String(r.numero) === String(numero); });
    if (row){
      out.push({ numero: row.numero, ape1: row.ape1, ape2: row.ape2, nombre: row.nombre, peloton: row.peloton });
    }
  });
  return out;
}

// La firma táctil del alumno es obligatoria antes de poder guardar CUALQUIER
// parte (sea cual sea la medida correctora), no solo Amonestación verbal —
// se pide en el propio formulario, un alumno detrás de otro. Esta función
// valida que venga una firma válida para cada alumno del parte y devuelve el
// objeto listo para guardar en el registro; si a alguno le falta o no es
// válida, lo señala en `faltantes`.
function validarFirmas(alumnos, firmasInput){
  const ahora = new Date().toISOString();
  const firmas = {};
  const faltantes = [];
  alumnos.forEach(function (al){
    const png = firmasInput && firmasInput[al.numero] != null ? String(firmasInput[al.numero]) : "";
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(png) || png.length > 900000){
      faltantes.push(al.numero);
      return;
    }
    firmas[al.numero] = { png: png, fecha: ahora };
  });
  return { firmas: firmas, faltantes: faltantes };
}

// Listado completo: solo el jefe de sección (ve todo lo introducido,
// incluido lo que entra desde los jefes de pelotón).
router.get("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  res.json({ sanciones: req.db.sanciones });
});

// Crear sanción: jefe de sección y jefe de pelotón. El jefe de pelotón solo
// puede crear, nunca listar ni ver las que ya existen.
router.post("/", auth.requireAuth, function (req, res){
  const b = req.body || {};
  const tipo = b.tipoFalta;
  const errores = [];

  if (tipo !== "LEVE" && tipo !== "GRAVE") errores.push("Tipo de falta inválido.");
  const lista = catalog.FALTA_CATALOG[tipo] || [];
  const idx = lista.indexOf(b.fundamento);
  if (idx === -1) errores.push("Fundamento legal inválido para ese tipo de falta.");
  if (!b.fecha) errores.push("Falta la fecha.");
  if (!b.motivo || !String(b.motivo).trim()) errores.push("Falta el motivo.");

  const alumnos = resolveAlumnos(req, b.alumnos);
  if (!alumnos.length) errores.push("No se ha reconocido ningún alumno.");
  if (alumnos.length > 25) errores.push("Máximo 25 alumnos por expediente múltiple.");

  const medida = b.medidaCorrectora ? String(b.medidaCorrectora) : "";
  if (medida && catalog.MEDIDA_OPTIONS.indexOf(medida) === -1) errores.push("Medida correctora inválida.");

  let arrestoFechaIni = "", arrestoFechaFin = "", arrestoDias = "", arrestoPendiente = false;
  if (medida === "Arresto"){
    arrestoPendiente = !!b.arrestoPendiente;
    if (arrestoPendiente){
      // Todavía no se sabe la fecha: se guarda como pendiente, para fijarla
      // más adelante desde el propio listado (ver PATCH /:id/arresto-fecha).
    } else {
      arrestoFechaIni = b.arrestoFechaIni || "";
      arrestoFechaFin = b.arrestoFechaFin || "";
      if (!arrestoFechaIni || !arrestoFechaFin || arrestoFechaFin < arrestoFechaIni){
        errores.push("El periodo de arresto no es válido.");
      } else {
        const dIni = new Date(arrestoFechaIni + "T00:00:00");
        const dFin = new Date(arrestoFechaFin + "T00:00:00");
        arrestoDias = Math.round((dFin - dIni) / 86400000) + 1;
      }
    }
  }

  let trabajoFechaFin = "";
  if (medida === "Trabajo no superior a 5 horas"){
    trabajoFechaFin = b.trabajoFechaFin || "";
    if (!trabajoFechaFin) errores.push("Indica la fecha límite para realizar el trabajo.");
  }

  const fase = b.fase === "FFMG" || b.fase === "FFE" ? b.fase : "";

  // Vincular esta falta a un expediente ya abierto (varias faltas bajo el
  // mismo número), en vez de abrir uno nuevo. Debe existir ya en esta
  // sección — no se admite inventar un número de expediente a mano.
  let expediente = null;
  if (b.vincularExpediente){
    const expNum = parseInt(b.expediente, 10);
    const existe = !isNaN(expNum) && req.db.sanciones.some(function (r){ return r.expediente === expNum; });
    if (!existe){
      errores.push("El expediente indicado no existe en esta sección.");
    } else {
      expediente = expNum;
    }
  }

  // La firma de cada alumno implicado es obligatoria para poder guardar el
  // parte, la valide primero por si acaso (el formulario ya la exige antes
  // de llegar aquí, pero esta comprobación es la que de verdad importa).
  const firmasResult = alumnos.length ? validarFirmas(alumnos, b.firmas) : { firmas: {}, faltantes: [] };
  if (firmasResult.faltantes.length){
    errores.push("Falta la firma de " + firmasResult.faltantes.length + " alumno(s) — todos deben firmar antes de guardar el parte.");
  }

  if (errores.length){
    return res.status(400).json({ error: errores.join(" ") });
  }

  const record = {
    id: crypto.randomUUID(),
    expediente: expediente != null ? expediente : nextExpediente(req),
    fecha: b.fecha,
    lugar: b.lugar ? String(b.lugar).trim() : "",
    hora: b.hora || "",
    tipoFalta: tipo,
    fundamento: b.fundamento,
    fundamentoLetra: catalog.apartadoLetra(idx),
    fase: fase,
    profEmpleo: b.profEmpleo || "",
    profNombre: b.profNombre ? String(b.profNombre).trim() : "",
    profApellidos: b.profApellidos ? String(b.profApellidos).trim() : "",
    profDni: b.profDni ? String(b.profDni).trim() : "",
    motivo: String(b.motivo).trim(),
    medidaCorrectora: medida,
    arrestoFechaIni: arrestoFechaIni,
    arrestoFechaFin: arrestoFechaFin,
    arrestoDias: arrestoDias,
    arrestoPendiente: arrestoPendiente,
    trabajoFechaFin: trabajoFechaFin,
    trabajoHecho: false,
    trabajoHechoFecha: null,
    observaciones: b.observaciones ? String(b.observaciones).trim() : "",
    alumnos: alumnos,
    firmas: firmasResult.firmas,
    createdAt: new Date().toISOString(),
    createdBy: { dni: req.user.dni, nombre: req.user.nombre, role: req.user.role }
  };

  req.db.sanciones.unshift(record);
  db.save();
  res.status(201).json({ ok: true, sancion: record });
});

// Guardar la firma táctil de un alumno sobre un parte ya existente (se usa
// para el documento de Amonestación verbal). El jefe de pelotón solo puede
// firmar los partes que él mismo dio de alta; el jefe de sección puede
// firmar cualquiera de su sección. No hace falta poder listar sanciones
// para poder llamar a esta ruta: basta con conocer el id devuelto al crear
// el parte.
router.patch("/:id/firma", auth.requireAuth, function (req, res){
  const record = req.db.sanciones.find(function (r){ return r.id === req.params.id; });
  if (!record) return res.status(404).json({ error: "No encontrado." });

  const isOwner = record.createdBy && record.createdBy.dni === req.user.dni;
  if (req.user.role !== "admin" && !isOwner){
    return res.status(403).json({ error: "No tienes permiso para firmar este parte." });
  }

  const numero = req.body && req.body.numero != null ? String(req.body.numero) : "";
  const firmaPng = req.body && req.body.firmaPng ? String(req.body.firmaPng) : "";

  if (!numero || !record.alumnos.some(function (a){ return String(a.numero) === numero; })){
    return res.status(400).json({ error: "Ese alumno no forma parte de este expediente." });
  }
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(firmaPng) || firmaPng.length > 900000){
    return res.status(400).json({ error: "Firma no válida." });
  }

  record.firmas = record.firmas || {};
  record.firmas[numero] = { png: firmaPng, fecha: new Date().toISOString() };
  db.save();
  res.json({ ok: true });
});

// Fija la fecha de un arresto que se guardó como "pendiente" (sección
// Sanciones, mini-formulario "Fijar fecha" en el propio listado, o desde
// Consultas → Sanciones de arresto con fecha pendiente).
router.patch("/:id/arresto-fecha", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const record = req.db.sanciones.find(function (r){ return r.id === req.params.id; });
  if (!record) return res.status(404).json({ error: "No encontrada." });
  if (record.medidaCorrectora !== "Arresto"){
    return res.status(400).json({ error: "Esta sanción no tiene medida de arresto." });
  }

  const ini = req.body && req.body.arrestoFechaIni;
  const fin = req.body && req.body.arrestoFechaFin;
  if (!ini || !fin || fin < ini){
    return res.status(400).json({ error: "Indica una fecha de inicio y fin válidas (la fecha de fin debe ser igual o posterior a la de inicio)." });
  }
  const dIni = new Date(ini + "T00:00:00");
  const dFin = new Date(fin + "T00:00:00");
  const dias = Math.round((dFin - dIni) / 86400000) + 1;

  record.arrestoFechaIni = ini;
  record.arrestoFechaFin = fin;
  record.arrestoDias = dias > 0 ? dias : "";
  record.arrestoPendiente = false;
  db.save();
  res.json({ ok: true, sancion: record });
});

// Marca/desmarca como hecho un trabajo (medida correctora "Trabajo no
// superior a 5 horas"). Se usa tanto desde el listado de Sanciones como
// desde Consultas → Sanciones de trabajo.
router.patch("/:id/trabajo-hecho", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const record = req.db.sanciones.find(function (r){ return r.id === req.params.id; });
  if (!record) return res.status(404).json({ error: "No encontrada." });
  if (record.medidaCorrectora !== "Trabajo no superior a 5 horas"){
    return res.status(400).json({ error: "Esta sanción no tiene medida de trabajo." });
  }
  const hecho = !!(req.body && req.body.hecho);
  record.trabajoHecho = hecho;
  record.trabajoHechoFecha = hecho ? new Date().toISOString() : null;
  db.save();
  res.json({ ok: true, sancion: record });
});

// Quita a UN alumno de UNA sanción concreta (no borra el expediente
// entero: si esa sanción tenía más alumnos, o si el mismo número de
// expediente tiene otras sanciones vinculadas, no se ven afectadas). Si
// era el único alumno de esa sanción concreta, la sanción desaparece por
// quedarse sin nadie. Se usa desde Consultas.
router.patch("/:id/quitar-alumno", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const record = req.db.sanciones.find(function (r){ return r.id === req.params.id; });
  if (!record) return res.status(404).json({ error: "No encontrada." });

  const numero = req.body && req.body.numero != null ? String(req.body.numero) : "";
  if (!numero) return res.status(400).json({ error: "Falta el número de alumno." });

  record.alumnos = (record.alumnos || []).filter(function (al){ return String(al.numero) !== numero; });
  let eliminada = false;
  if (!record.alumnos.length){
    req.db.sanciones = req.db.sanciones.filter(function (r){ return r.id !== record.id; });
    eliminada = true;
  }
  db.save();
  res.json({ ok: true, eliminada: eliminada });
});

// Eliminar: solo jefe de sección.
router.delete("/:id", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const before = req.db.sanciones.length;
  req.db.sanciones = req.db.sanciones.filter(function (r){ return r.id !== req.params.id; });
  if (req.db.sanciones.length === before){
    return res.status(404).json({ error: "No encontrada." });
  }
  db.save();
  res.json({ ok: true });
});

module.exports = router;
