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
  record.medidaCorrectora = medida;
  record.medidaRevisadaPor = { dni: req.user.dni, nombre: req.user.nombre, at: new Date().toISOString() };
  if (medida !== "Trabajo no superior a 5 horas"){
    /* se mantiene la fecha si existía; no se borra histórico */
  }
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
