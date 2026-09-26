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

// Los partes con arresto no se retiran aquí: tienen que validarse con
// «Guardar medida», que es lo que los envía al capitán.
router.post("/avisos/leer", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  let quedan = 0;
  lista(req).forEach(function (a){
    if (a.leido) return;
    if (a.medida === "Arresto"){ quedan++; return; }
    a.leido = true;
  });
  db.save();
  res.json({ ok: true, quedanArrestos: quedan });
});

module.exports = router;
