// Hoja de seguimiento del alumno (v37). Se rellena con sus sanciones: el
// jefe de sección elige cuáles figuran y puede reescribir las observaciones
// sin tocar el expediente original. Aquí solo se guarda esa selección y ese
// texto, por alumno, y el «Ciclo» de la sección que sale en la cabecera.
// Mismo formato que el HTML local:
//   seguimientos: { numero: { lineas: { sancionId: { incluida, observaciones } }, actualizado } }
const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();
const MAX_OBS = 2000;
const MAX_CICLO = 40;

function asegurar(t){
  if (!t.seguimientos || typeof t.seguimientos !== "object" || Array.isArray(t.seguimientos)) t.seguimientos = {};
  if (typeof t.seguimientoCiclo !== "string") t.seguimientoCiclo = "";
}

router.get("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  asegurar(req.db);
  res.json({ seguimientos: req.db.seguimientos, ciclo: req.db.seguimientoCiclo });
});

router.put("/ciclo", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  asegurar(req.db);
  const ciclo = String((req.body && req.body.ciclo) || "").trim();
  if (ciclo.length > MAX_CICLO) return res.status(400).json({ error: "El ciclo es demasiado largo." });
  req.db.seguimientoCiclo = ciclo;
  db.save();
  res.json({ ok: true, ciclo: ciclo });
});

router.put("/:numero", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  asegurar(req.db);
  const numero = String(req.params.numero || "").trim();
  const enSeccion = (req.db.roster || []).concat(req.db.bajas || []).some(function (r){ return String(r.numero) === numero; });
  if (!numero || !enSeccion) return res.status(404).json({ error: "Ese alumno no está en esta sección." });

  const entrada = req.body && req.body.lineas;
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)){
    return res.status(400).json({ error: "Faltan las líneas de la hoja." });
  }
  // Solo se guardan líneas de sanciones que existen y en las que figura el alumno.
  const suyas = {};
  req.db.sanciones.forEach(function (s){
    if ((s.alumnos || []).some(function (al){ return String(al.numero) === numero; })) suyas[s.id] = true;
  });
  const lineas = {};
  for (const id of Object.keys(entrada)){
    if (!suyas[id]) continue;
    const l = entrada[id] || {};
    const obs = String(l.observaciones == null ? "" : l.observaciones);
    if (obs.length > MAX_OBS) return res.status(400).json({ error: "Las observaciones son demasiado largas." });
    lineas[id] = { incluida: !!l.incluida, observaciones: obs };
  }
  req.db.seguimientos[numero] = { lineas: lineas, actualizado: new Date().toISOString() };
  db.save();
  res.json({ ok: true, seguimiento: req.db.seguimientos[numero] });
});

module.exports = router;
