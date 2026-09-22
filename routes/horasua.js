// Horas UA: en qué fecha se ha impartido cada hora (teórica/práctica) de
// cada Unidad de Aprendizaje del temario (FFMG/FFE). El catálogo del
// temario en sí es fijo y vive en el cliente (es el mismo para todas las
// secciones); aquí solo se guarda, por sección, el mapa transaccional
// "<uaId>:T:<n>" / "<uaId>:P:<n>" -> fecha ISO. No tiene relación con
// alumnos ni con roster — es un progreso curricular propio de la sección.
const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Lista completa del mapa de fechas marcadas de la sección.
router.get("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureHorasUaShape(req.db);
  res.json({ fechas: req.db.horasUaFechas });
});

// Marca o borra la fecha de UN hueco concreto (una hora teórica o práctica
// de una UA). `fecha` vacía/null borra la marca.
router.patch("/hueco", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureHorasUaShape(req.db);
  const id = req.body && req.body.id ? String(req.body.id).trim() : "";
  if (!id) return res.status(400).json({ error: "Falta el identificador del hueco." });

  const fecha = req.body && req.body.fecha ? String(req.body.fecha).trim() : "";
  if (fecha && !FECHA_RE.test(fecha)){
    return res.status(400).json({ error: "Fecha inválida (formato AAAA-MM-DD)." });
  }
  if (fecha){
    req.db.horasUaFechas[id] = fecha;
  } else {
    delete req.db.horasUaFechas[id];
  }
  db.save();
  res.json({ ok: true, fechas: req.db.horasUaFechas });
});

// Aplica una misma fecha a varios huecos de golpe (botón "aplicar a toda la
// UA"), pero sin pisar los que ya tuvieran una fecha válida marcada.
router.post("/aplicar-lote", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureHorasUaShape(req.db);
  const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : null;
  const fecha = req.body && req.body.fecha ? String(req.body.fecha).trim() : "";
  if (!ids || !ids.length){
    return res.status(400).json({ error: "Falta la lista de huecos." });
  }
  if (!FECHA_RE.test(fecha)){
    return res.status(400).json({ error: "Fecha inválida (formato AAAA-MM-DD)." });
  }
  ids.forEach(function (id){
    const key = String(id);
    const actual = req.db.horasUaFechas[key];
    if (!actual || !FECHA_RE.test(actual)){
      req.db.horasUaFechas[key] = fecha;
    }
  });
  db.save();
  res.json({ ok: true, fechas: req.db.horasUaFechas });
});

// Quita la fecha de varios huecos de golpe (botón "quitar" de toda una UA).
router.post("/quitar-lote", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureHorasUaShape(req.db);
  const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : null;
  if (!ids || !ids.length){
    return res.status(400).json({ error: "Falta la lista de huecos." });
  }
  ids.forEach(function (id){
    delete req.db.horasUaFechas[String(id)];
  });
  db.save();
  res.json({ ok: true, fechas: req.db.horasUaFechas });
});

// Vacía todas las fechas marcadas de la sección (botón "vaciar").
router.delete("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureHorasUaShape(req.db);
  req.db.horasUaFechas = {};
  db.save();
  res.json({ ok: true, fechas: req.db.horasUaFechas });
});

module.exports = router;
