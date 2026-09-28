const express = require("express");
const crypto = require("crypto");
const db = require("../lib/db");
const auth = require("../lib/auth");
const quitarAlumno = require("../lib/quitarAlumno.js");

const router = express.Router();

const FIELDS = [
  "origen", "expediente", "sancionId", "alumnos", "fechaInicio", "fechaFin",
  "tipo", "horaInicio", "duracion", "horaInicioFinde", "duracionFinde",
  "observaciones", "fecha", "lugar", "hora",
  "profEmpleo", "profNombre", "profApellidos", "profDni", "tipoFalta",
  "fundamento", "fundamentoLetra", "motivo", "audDia", "audHora", "jefeCia", "lugarFecha"
];

// Refuerzos: la gestión (crear/eliminar) es solo del jefe de sección. La
// consulta de solo lectura también la puede ver un jefe de pelotón si el
// jefe de sección le ha concedido el permiso "verRebajesRefuerzos".
router.get("/", auth.requireAuth, auth.requirePermiso("verRebajesRefuerzos"), function (req, res){
  res.json({ refuerzos: req.db.refuerzos });
});

router.post("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const b = req.body || {};
  if (!b.fechaInicio || !Array.isArray(b.alumnos) || !b.alumnos.length){
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }
  const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  FIELDS.forEach(function (k){ record[k] = b[k] !== undefined ? b[k] : ""; });
  record.createdBy = { dni: req.user.dni, nombre: req.user.nombre };
  record.rellenado = false;
  record.rellenadoFecha = null;
  record.editado = false;
  record.editadoFecha = null;
  req.db.refuerzos.unshift(record);
  db.save();
  res.status(201).json({ ok: true, refuerzo: record });
});

// Corrige un refuerzo YA guardado (venga de una sanción o manual): alumno(s),
// fechas/horario y datos del documento. No toca id/origen/expediente/
// sancionId/createdAt/createdBy/rellenado/rellenadoFecha — solo el
// contenido editable. Marca editado/editadoFecha para dejar constancia.
router.put("/:id", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const record = req.db.refuerzos.find(function (r){ return r.id === req.params.id; });
  if (!record) return res.status(404).json({ error: "No encontrado." });

  const b = req.body || {};
  if (!b.fechaInicio || !Array.isArray(b.alumnos) || !b.alumnos.length){
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }
  FIELDS.forEach(function (k){
    if (k === "origen" || k === "expediente" || k === "sancionId") return; // se conservan del alta original
    record[k] = b[k] !== undefined ? b[k] : "";
  });
  record.editado = true;
  record.editadoFecha = new Date().toISOString();
  db.save();
  res.json({ ok: true, refuerzo: record });
});

// Marca el refuerzo como "documento generado" (tras descargar el PDF), para
// mostrar la insignia "RELLENADO" en el listado.
router.patch("/:id/rellenado", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const record = req.db.refuerzos.find(function (r){ return r.id === req.params.id; });
  if (!record) return res.status(404).json({ error: "No encontrado." });
  record.rellenado = true;
  record.rellenadoFecha = new Date().toISOString();
  // El documento recién generado ya lleva los alumnos que hay ahora: el
  // aviso de «hay que regenerarlo» deja de tener sentido.
  delete record.docPendiente;
  db.save();
  res.json({ ok: true, refuerzo: record });
});

// «Ya lo he hecho»: quita el aviso de documento pendiente sin generar nada
// (el jefe de sección ya tiene el documento correcto por otro medio).
router.patch("/:id/descartar-aviso-documento", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const record = req.db.refuerzos.find(function (r){ return r.id === req.params.id; });
  if (!record) return res.status(404).json({ error: "No encontrado." });
  delete record.docPendiente;
  db.save();
  res.json({ ok: true, refuerzo: record });
});

// Quita a UN alumno de un refuerzo MANUAL (v37). Un refuerzo derivado de
// una sanción se corrige desde la pestaña Sanciones, que es el único sitio
// para quitar a un alumno de una sanción (y de su refuerzo a la vez).
router.patch("/:id/quitar-alumno", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const record = req.db.refuerzos.find(function (r){ return r.id === req.params.id; });
  if (!record) return res.status(404).json({ error: "No encontrado." });
  if (record.origen === "sancion"){
    return res.status(409).json({ error: "Este refuerzo viene de una sanción: quita al alumno desde la pestaña Sanciones." });
  }
  const numero = req.body && req.body.numero != null ? String(req.body.numero) : "";
  if (!numero) return res.status(400).json({ error: "Falta el número de alumno." });
  if (!(record.alumnos || []).some(function (al){ return String(al.numero) === numero; })){
    return res.status(404).json({ error: "Ese alumno no está en este refuerzo." });
  }
  const r = quitarAlumno.quitarDeRefuerzo(req.db, record, numero);
  db.save();
  res.json({ ok: true, eliminado: r.eliminado, refuerzo: r.eliminado ? null : r.refuerzo });
});

// v37: ya no hay «eliminar refuerzo entero». Un refuerzo MANUAL se corrige
// alumno a alumno con PATCH /:id/quitar-alumno; uno derivado de una sanción,
// desde la pestaña Sanciones.

module.exports = router;
