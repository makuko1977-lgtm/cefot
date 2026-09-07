const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");
const router = express.Router();

function lista(req){
  req.db.avisos = req.db.avisos || [];
  return req.db.avisos;
}

router.get("/avisos", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const all = lista(req);
  res.json({
    avisos: all.filter(function (a){ return !a.leido; }),
    total: all.filter(function (a){ return !a.leido; }).length
  });
});

router.post("/avisos/leer", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  lista(req).forEach(function (a){ a.leido = true; });
  db.save();
  res.json({ ok: true });
});

module.exports = router;
