const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");
const router = express.Router();

function publicJefe(j){
  return { dni: j.dni, nombre: j.nombre, createdAt: j.createdAt };
}
function requireSA(req, res, next){
  if (auth.isSuperAdminUser(req.user)) return next();
  return res.status(403).json({ error: "No tienes permiso para esta acción." });
}

router.get("/jefes-estudios", auth.requireAuth, requireSA, function (req, res){
  res.json({ jefes: (db.data.jefesEstudios || []).map(publicJefe) });
});

router.post("/jefes-estudios", auth.requireAuth, requireSA, function (req, res){
  const parsed = auth.parseUsuario(req.body && req.body.dni);
  const nombre = String((req.body && req.body.nombre) || "").trim();
  const password = String((req.body && req.body.password) || "");
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  if (auth.dniReservado(parsed.value)) return res.status(400).json({ error: "Ese identificador está reservado; elige otro." });
  if (!nombre || password.length < 6){
    return res.status(400).json({ error: "Nombre y una contraseña de al menos 6 caracteres son obligatorios." });
  }
  if (db.findUserGlobal(parsed.value)){
    return res.status(409).json({ error: "Ya existe un usuario con ese identificador." });
  }
  const jefe = {
    dni: parsed.value,
    nombre: nombre,
    passwordHash: auth.hashPassword(password),
    createdAt: new Date().toISOString()
  };
  db.data.jefesEstudios = db.data.jefesEstudios || [];
  db.data.jefesEstudios.push(jefe);
  db.save();
  res.status(201).json({ ok: true, jefe: publicJefe(jefe) });
});

router.delete("/jefes-estudios/:dni", auth.requireAuth, requireSA, function (req, res){
  const dni = auth.normalizeDni(req.params.dni);
  const before = (db.data.jefesEstudios || []).length;
  db.data.jefesEstudios = (db.data.jefesEstudios || []).filter(function (j){ return j.dni !== dni; });
  if (db.data.jefesEstudios.length === before) return res.status(404).json({ error: "No encontrado." });
  db.save();
  res.json({ ok: true });
});

module.exports = router;
