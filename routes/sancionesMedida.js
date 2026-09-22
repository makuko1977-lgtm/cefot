const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");
const catalog = require("../public/shared/catalog.js");
const router = express.Router();

router.patch("/:id/medida", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const record = req.db.sanciones.find(function (r){ return r.id === req.params.id; });
  if (!record) return res.status(404).json({ error: "No encontrada." });
  const medida = String((req.body && req.body.medidaCorrectora) || "");
  if (catalog.MEDIDA_OPTIONS.indexOf(medida) === -1){
    return res.status(400).json({ error: "Medida correctora no válida." });
  }
  const b = req.body || {};
  record.medidaCorrectora = medida;

  // Arresto: si el jefe de sección no indica las dos fechas al aceptar o
  // cambiar la medida, queda "pendiente" (se fijarán más adelante desde el
  // propio listado), igual que cuando se da de alta un arresto sin saber
  // todavía las fechas.
  if (medida === "Arresto"){
    const ini = String(b.arrestoFechaIni || "");
    const fin = String(b.arrestoFechaFin || "");
    if (ini && fin && fin >= ini){
      const dIni = new Date(ini + "T00:00:00");
      const dFin = new Date(fin + "T00:00:00");
      record.arrestoFechaIni = ini;
      record.arrestoFechaFin = fin;
      record.arrestoDias = Math.round((dFin - dIni) / 86400000) + 1;
      record.arrestoPendiente = false;
    } else {
      record.arrestoFechaIni = "";
      record.arrestoFechaFin = "";
      record.arrestoDias = "";
      record.arrestoPendiente = true;
    }
  } else {
    record.arrestoFechaIni = "";
    record.arrestoFechaFin = "";
    record.arrestoDias = "";
    record.arrestoPendiente = false;
  }

  // Trabajo: si no se indica fecha límite al aceptar o cambiar la medida,
  // queda pendiente de fijarla cuando se haga (se pondrá entonces la fecha
  // de entrega/realización).
  if (medida === "Trabajo no superior a 5 horas"){
    const limite = String(b.trabajoFechaFin || "");
    record.trabajoFechaFin = limite;
    record.trabajoPendiente = !limite;
  } else {
    record.trabajoFechaFin = "";
    record.trabajoPendiente = false;
  }

  record.medidaRevisadaPor = { dni: req.user.dni, nombre: req.user.nombre, at: new Date().toISOString() };
  const avisos = req.db.avisos || [];
  avisos.forEach(function (a){
    if (a.sancionId === record.id){
      a.medida = medida;
      a.leido = true;
    }
  });
  db.save();
  res.json({ ok: true, sancion: record });
});

module.exports = router;
