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

function publicJefe(j){
  return { dni: j.dni, nombre: j.nombre, createdAt: j.createdAt };
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

router.get("/jefes", auth.requireAuth, auth.requireSuperAdmin, function (req, res){
  res.json({ jefes: (db.data.jefesEstudios || []).map(publicJefe) });
});

router.post("/jefes", auth.requireAuth, auth.requireSuperAdmin, function (req, res){
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

router.patch("/jefes/:dni", auth.requireAuth, auth.requireSuperAdmin, function (req, res){
  const dni = auth.normalizeDni(req.params.dni);
  const jefe = (db.data.jefesEstudios || []).find(function (j){ return j.dni === dni; });
  if (!jefe) return res.status(404).json({ error: "No encontrado." });
  const b = req.body || {};
  if (b.nombre && String(b.nombre).trim()) jefe.nombre = String(b.nombre).trim();
  if (b.password){
    if (String(b.password).length < 6){
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
    }
    jefe.passwordHash = auth.hashPassword(String(b.password));
  }
  if (b.dni && auth.normalizeDni(b.dni) !== jefe.dni){
    const parsed = auth.parseUsuario(b.dni);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    if (auth.dniReservado(parsed.value)) return res.status(400).json({ error: "Ese identificador está reservado; elige otro." });
    if (db.findUserGlobal(parsed.value)){
      return res.status(409).json({ error: "Ya existe un usuario con ese identificador." });
    }
    jefe.dni = parsed.value;
  }
  db.save();
  res.json({ ok: true, jefe: publicJefe(jefe) });
});

router.delete("/jefes/:dni", auth.requireAuth, auth.requireSuperAdmin, function (req, res){
  const dni = auth.normalizeDni(req.params.dni);
  const before = (db.data.jefesEstudios || []).length;
  db.data.jefesEstudios = (db.data.jefesEstudios || []).filter(function (j){ return j.dni !== dni; });
  if (db.data.jefesEstudios.length === before) return res.status(404).json({ error: "No encontrado." });
  db.save();
  res.json({ ok: true });
});

module.exports = router;
