const express = require("express");
const crypto = require("crypto");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();

// Rebajes: la gestión (crear/eliminar) es solo del jefe de sección. La
// consulta de solo lectura también la puede ver un jefe de pelotón si el
// jefe de sección le ha concedido el permiso "verRebajesRefuerzos".
router.get("/", auth.requireAuth, auth.requirePermiso("verRebajesRefuerzos"), function (req, res){
  res.json({ rebajes: req.db.rebajes });
});

router.post("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const b = req.body || {};
  if (!b.numero || !b.fechaInicio || !b.fechaFin){
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }
  const record = {
    id: crypto.randomUUID(),
    numero: b.numero,
    ape1: b.ape1 || "",
    ape2: b.ape2 || "",
    nombre: b.nombre || "",
    peloton: b.peloton || "",
    fechaInicio: b.fechaInicio,
    fechaFin: b.fechaFin,
    total: !!b.total,
    categorias: b.categorias && typeof b.categorias === "object" ? b.categorias : {},
    createdAt: new Date().toISOString(),
    createdBy: { dni: req.user.dni, nombre: req.user.nombre }
  };
  req.db.rebajes.unshift(record);
  db.save();
  res.status(201).json({ ok: true, rebaje: record });
});

router.delete("/:id", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const before = req.db.rebajes.length;
  req.db.rebajes = req.db.rebajes.filter(function (r){ return r.id !== req.params.id; });
  if (req.db.rebajes.length === before){
    return res.status(404).json({ error: "No encontrado." });
  }
  db.save();
  res.json({ ok: true });
});

module.exports = router;
