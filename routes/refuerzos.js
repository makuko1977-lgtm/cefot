const express = require("express");
const crypto = require("crypto");
const db = require("../lib/db");
const auth = require("../lib/auth");

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
  db.save();
  res.json({ ok: true, refuerzo: record });
});

router.delete("/:id", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const before = req.db.refuerzos.length;
  req.db.refuerzos = req.db.refuerzos.filter(function (r){ return r.id !== req.params.id; });
  if (req.db.refuerzos.length === before){
    return res.status(404).json({ error: "No encontrado." });
  }
  db.save();
  res.json({ ok: true });
});

module.exports = router;
