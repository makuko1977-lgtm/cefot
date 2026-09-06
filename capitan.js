// Panel del Capitán de Compañía: no tiene sección propia, sino acceso a las
// 5 secciones (1ª-5ª) de UNA compañía (1ª-4ª). Para no duplicar ninguna
// lógica de negocio, un capitán "entra" en una de esas secciones y recibe
// un token con el tenantId/role de ESA sección ("token-swap"): a partir de
// ahí, todas las rutas de sanciones/rebajes/refuerzos/consultas/roster ya
// existentes funcionan sin cambios, atribuyendo correctamente lo que cree
// al propio capitán (su dni/nombre reales viajan en el token). El único
// cuidado extra es bloquear explícitamente, en esas mismas secciones, lo
// que un capitán NO debe poder hacer aunque el token diga role: "admin":
// gestionar el roster (altas/bajas de alumnos) y gestionar usuarios
// (jefes de sección/pelotón) — ver los guards en routes/roster.js y
// routes/admin.js.
const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();

// Lista las 5 secciones (1ª-5ª) de la compañía del capitán, indicando
// cuáles existen ya (tienen jefe de sección dado de alta) y cuáles no.
router.get("/secciones", auth.requireAuth, auth.requireCapitan, function (req, res){
  const compania = req.user.capitanCompania;
  const secciones = [];
  for (let seccion = 1; seccion <= 5; seccion++){
    const id = db.tenantKey(compania, seccion);
    const t = db.tenant(id);
    if (!t){
      secciones.push({ id: id, compania: compania, seccion: seccion, existe: false });
      continue;
    }
    const jefe = t.users.find(function (u){ return u.role === "admin"; });
    secciones.push({
      id: id,
      compania: compania,
      seccion: seccion,
      existe: true,
      nombre: t.nombre,
      jefeSeccion: jefe ? { dni: jefe.dni, nombre: jefe.nombre } : null,
      totales: {
        alumnos: t.roster.length,
        sanciones: t.sanciones.length,
        rebajes: t.rebajes.length,
        refuerzos: t.refuerzos.length
      }
    });
  }
  res.json({ compania: compania, secciones: secciones });
});

// "Entra" en una de las secciones de su compañía: reemite la cookie de
// sesión con tenantId/role de esa sección, conservando su propia identidad
// (dni/nombre) y el marcador capitanCompania (para que el resto de la app
// sepa que sigue siendo un capitán actuando y pueda, por ejemplo, mostrar
// el aviso de "modo capitán" y bloquear roster/usuarios).
router.post("/secciones/:seccionId/entrar", auth.requireAuth, auth.requireCapitan, function (req, res){
  const seccionId = String(req.params.seccionId || "");
  const parts = seccionId.split("-");
  const compania = parseInt(parts[0], 10);
  if (compania !== Number(req.user.capitanCompania)){
    return res.status(403).json({ error: "Esa sección no pertenece a tu compañía." });
  }

  const t = db.tenant(seccionId);
  if (!t){
    return res.status(404).json({ error: "Esa sección todavía no ha sido creada por el Súper Administrador." });
  }

  const token = auth.issueToken(
    { dni: req.user.dni, nombre: req.user.nombre },
    "admin",
    seccionId,
    false,
    req.user.capitanCompania
  );
  auth.setAuthCookie(res, token);
  res.json({
    dni: req.user.dni,
    nombre: req.user.nombre,
    role: "admin",
    tenantId: seccionId,
    superAdmin: false,
    capitanCompania: req.user.capitanCompania
  });
});

// Cambia la contraseña del propio capitán logueado.
router.patch("/mi-password", auth.requireAuth, auth.requireCapitan, function (req, res){
  const password = String((req.body && req.body.password) || "");
  if (password.length < 6){
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." });
  }
  const capitan = db.findCapitanByCompania(req.user.capitanCompania);
  if (!capitan){
    return res.status(404).json({ error: "No se ha encontrado tu usuario." });
  }
  capitan.passwordHash = auth.hashPassword(password);
  db.save();
  res.json({ ok: true });
});

module.exports = router;
