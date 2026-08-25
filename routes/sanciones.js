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

  let arrestoFechaIni = "", arrestoFechaFin = "", arrestoDias = "";
  if (medida === "Arresto"){
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
    expediente: nextExpediente(req),
    fecha: b.fecha,
    lugar: b.lugar ? String(b.lugar).trim() : "",
    hora: b.hora || "",
    tipoFalta: tipo,
    fundamento: b.fundamento,
    fundamentoLetra: catalog.apartadoLetra(idx),
    profEmpleo: b.profEmpleo || "",
    profNombre: b.profNombre ? String(b.profNombre).trim() : "",
    profApellidos: b.profApellidos ? String(b.profApellidos).trim() : "",
    profDni: b.profDni ? String(b.profDni).trim() : "",
    motivo: String(b.motivo).trim(),
    medidaCorrectora: medida,
    arrestoFechaIni: arrestoFechaIni,
    arrestoFechaFin: arrestoFechaFin,
    arrestoDias: arrestoDias,
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
