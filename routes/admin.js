const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();

function publicUser(u){
  return {
    dni: u.dni,
    nombre: u.nombre,
    role: u.role,
    createdAt: u.createdAt,
    permisos: auth.normalizePermisos(u.permisos)
  };
}

router.get("/backup", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const snapshot = {
    exportedAt: new Date().toISOString(),
    seccion: { compania: req.db.compania, seccion: req.db.seccion, nombre: req.db.nombre },
    roster: req.db.roster,
    sanciones: req.db.sanciones,
    rebajes: req.db.rebajes,
    refuerzos: req.db.refuerzos
  };
  res.setHeader("Content-Disposition", "attachment; filename=cefot2_copia_seguridad.json");
  res.json(snapshot);
});

router.get("/resumen-curso", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  res.json({
    actual: {
      roster: req.db.roster.length,
      sanciones: req.db.sanciones.length,
      rebajes: req.db.rebajes.length,
      refuerzos: req.db.refuerzos.length
    },
    historial: req.db.cursosHistorial || []
  });
});

router.post("/cerrar-curso", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, async function (req, res){
  const incluirRoster = !!(req.body && req.body.incluirRoster);
  const CONFIRMACION = "CERRAR CURSO";
  if (String(req.body && req.body.confirmacion || "").trim() !== CONFIRMACION){
    return res.status(400).json({ error: "Falta confirmar la acción escribiendo exactamente «" + CONFIRMACION + "»." });
  }

  const resumen = {
    fecha: new Date().toISOString(),
    cerradoPor: { dni: req.user.dni, nombre: req.user.nombre },
    sanciones: req.db.sanciones.length,
    rebajes: req.db.rebajes.length,
    refuerzos: req.db.refuerzos.length,
    roster: incluirRoster ? req.db.roster.length : 0,
    incluyoRoster: incluirRoster
  };

  req.db.sanciones = [];
  req.db.rebajes = [];
  req.db.refuerzos = [];
  req.db.expedienteCounter = 0;
  if (incluirRoster){
    req.db.roster = [];
    req.db.rosterUpdatedAt = null;
    req.db.rosterUpdatedBy = null;
  }
  req.db.cursosHistorial = req.db.cursosHistorial || [];
  req.db.cursosHistorial.unshift(resumen);
  req.db.cursosHistorial = req.db.cursosHistorial.slice(0, 20);

  try {
    await db.saveStrict();
  } catch (err){
    return res.status(500).json({ error: "No se ha podido guardar el cierre de curso (fallo al escribir en la base de datos); no se ha confirmado nada, vuelve a intentarlo en unos segundos." });
  }
  res.json({ ok: true, resumen: resumen });
});

router.get("/usuarios", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const usuarios = req.db.users.filter(function (u){ return u.role === "instructor"; }).map(publicUser);
  res.json({ usuarios: usuarios });
});

router.post("/usuarios", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  const parsed = auth.parseUsuario(req.body.dni);
  const nombre = String(req.body.nombre || "").trim();
  const password = String(req.body.password || "");
  const role = "instructor";

  if (!parsed.ok){
    return res.status(400).json({ error: parsed.error });
  }
  if (!nombre || password.length < 6){
    return res.status(400).json({ error: "Nombre y una contraseña de al menos 6 caracteres son obligatorios." });
  }
  const dni = parsed.value;
  if (db.findUserGlobal(dni)){
    return res.status(409).json({ error: "Ya existe un usuario con ese identificador (en esta u otra sección)." });
  }

  const user = {
    dni: dni,
    nombre: nombre,
    role: role,
    passwordHash: auth.hashPassword(password),
    permisos: auth.normalizePermisos(req.body.permisos),
    createdAt: new Date().toISOString()
  };
  req.db.users.push(user);
  db.save();
  res.status(201).json({ ok: true, usuario: publicUser(user) });
});

router.patch("/usuarios/:dni/password", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  const dni = auth.normalizeDni(req.params.dni);
  const password = String(req.body.password || "");
  if (password.length < 6){
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }
  const user = req.db.users.find(function (u){ return u.dni === dni; });
  if (!user) return res.status(404).json({ error: "No encontrado." });
  user.passwordHash = auth.hashPassword(password);
  db.save();
  res.json({ ok: true });
});

router.patch("/usuarios/:dni/permisos", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  const dni = auth.normalizeDni(req.params.dni);
  const user = req.db.users.find(function (u){ return u.dni === dni; });
  if (!user) return res.status(404).json({ error: "No encontrado." });
  user.permisos = auth.normalizePermisos(req.body.permisos);
  db.save();
  res.json({ ok: true, usuario: publicUser(user) });
});

router.delete("/usuarios/:dni", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  const dni = auth.normalizeDni(req.params.dni);
  if (dni === req.user.dni){
    return res.status(400).json({ error: "No puedes eliminar tu propia cuenta." });
  }
  const before = req.db.users.length;
  req.db.users = req.db.users.filter(function (u){ return u.dni !== dni; });
  if (req.db.users.length === before){
    return res.status(404).json({ error: "No encontrado." });
  }
  db.save();
  res.json({ ok: true });
});

module.exports = router;
