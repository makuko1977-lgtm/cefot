const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");
const estadisticas = require("../lib/estadisticas");

const router = express.Router();

function requireEstudios(req, res, next){
  if (!req.user) return res.status(401).json({ error: "No autenticado." });
  if (req.user.jefeEstudios || req.user.superAdmin) return next();
  return res.status(403).json({ error: "Solo el jefe de estudios o el súper administrador pueden ver estas estadísticas." });
}

router.get("/estadisticas", auth.requireAuth, requireEstudios, function (req, res){
  const cia = req.query.compania ? parseInt(req.query.compania, 10) : null;
  const sec = req.query.seccion ? parseInt(req.query.seccion, 10) : null;
  let tenants = db.listTenants();
  if (cia >= 1 && cia <= 4) tenants = tenants.filter(function (t){ return Number(t.compania) === cia; });
  if (sec >= 1 && sec <= 5) tenants = tenants.filter(function (t){ return Number(t.seccion) === sec; });
  const out = estadisticas.resumen(tenants);
  out.filtro = { compania: cia || null, seccion: sec || null, seccionesIncluidas: tenants.length };
  res.json(out);
});

module.exports = router;
