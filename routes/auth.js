const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();

// ---------------- protección contra fuerza bruta en el login ----------------
const MAX_INTENTOS = 5;
const VENTANA_MS = 10 * 60 * 1000; // 10 minutos
const intentosFallidos = new Map(); // clave -> { count, first, blockedUntil }

function limiterKey(req, dni){
  return (req.ip || "sin-ip") + "|" + dni;
}

function limpiarSiExpirado(entry){
  if (entry && entry.first && Date.now() - entry.first > VENTANA_MS && (!entry.blockedUntil || Date.now() > entry.blockedUntil)){
    return null;
  }
  return entry;
}

const limpiezaTimer = setInterval(function (){
  const ahora = Date.now();
  intentosFallidos.forEach(function (entry, key){
    if (entry.first && ahora - entry.first > VENTANA_MS && (!entry.blockedUntil || ahora > entry.blockedUntil)){
      intentosFallidos.delete(key);
    }
  });
}, VENTANA_MS);
if (limpiezaTimer.unref) limpiezaTimer.unref();

// El login ya no busca en un único listado de usuarios: busca en todo el
// sistema (súper administradores + las secciones de todas las compañías),
// porque todavía no se sabe a qué sección pertenece quien intenta entrar
// hasta que se identifica el DNI.
router.post("/login", function (req, res){
  const dni = auth.normalizeDni(req.body.dni);
  const password = String(req.body.password || "");
  const key = limiterKey(req, dni);

  let entry = limpiarSiExpirado(intentosFallidos.get(key));
  if (entry && entry.blockedUntil && Date.now() < entry.blockedUntil){
    const esperaSeg = Math.ceil((entry.blockedUntil - Date.now()) / 1000);
    res.setHeader("Retry-After", String(esperaSeg));
    return res.status(429).json({ error: "Demasiados intentos fallidos. Espera " + esperaSeg + " segundos antes de volver a intentarlo." });
  }

  const found = db.findUserGlobal(dni);
  if (!found || !auth.verifyPassword(password, found.user.passwordHash)){
    entry = entry || { count: 0, first: Date.now() };
    entry.count += 1;
    if (entry.count >= MAX_INTENTOS){
      entry.blockedUntil = Date.now() + 30000 * (entry.count - MAX_INTENTOS + 1);
    }
    intentosFallidos.set(key, entry);
    return res.status(401).json({ error: "DNI o contraseña incorrectos." });
  }

  intentosFallidos.delete(key);
  const token = auth.issueToken(found.user, found.role, found.tenantId, found.superAdmin);
  auth.setAuthCookie(res, token);
  res.json({ dni: found.user.dni, nombre: found.user.nombre, role: found.role, tenantId: found.tenantId, superAdmin: !!found.superAdmin });
});

router.post("/logout", function (req, res){
  auth.clearAuthCookie(res);
  res.json({ ok: true });
});

// Igual para todo el mundo: siempre incluye `superAdmin`, y además `tenant`
// (con `role`/`permisos` dentro) cuando quien pregunta tiene sección propia.
// Así una misma cuenta con doble función (jefe de sección + Súper
// Administrador) recibe de golpe todo lo que necesita para decidir qué
// pantalla mostrar, sin dos peticiones distintas.
router.get("/me", auth.requireAuth, function (req, res){
  const out = {
    dni: req.user.dni,
    nombre: req.user.nombre,
    superAdmin: !!req.user.superAdmin,
    tenant: null
  };
  if (req.db){
    const user = req.db.users.find(function (u){ return u.dni === req.user.dni; });
    out.tenant = {
      id: req.user.tenantId,
      compania: req.db.compania,
      seccion: req.db.seccion,
      nombre: req.db.nombre,
      role: req.user.role,
      permisos: auth.normalizePermisos(user && user.permisos)
    };
  }
  res.json(out);
});

module.exports = router;
