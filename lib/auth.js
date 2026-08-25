const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const COOKIE_NAME = "cefot2_token";
const TOKEN_TTL = "12h";

function hashPassword(plain){
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash){
  return bcrypt.compareSync(plain, hash);
}

function normalizeDni(dni){
  return String(dni || "").trim().toUpperCase();
}

// role: "admin" (jefe de sección) | "instructor" (jefe de pelotón) | null (sin
// sección propia). superAdmin: booleano independiente del rol — la misma
// persona puede tener role: "admin" en su sección Y superAdmin: true a la
// vez, con un único token/contraseña.
// tenantId: "compañía-sección" (p. ej. "3-3"); null si no tiene sección propia.
function issueToken(user, role, tenantId, superAdmin){
  return jwt.sign(
    { dni: user.dni, role: role || null, nombre: user.nombre, tenantId: tenantId || null, superAdmin: !!superAdmin },
    db.data.jwtSecret,
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token){
  try {
    return jwt.verify(token, db.data.jwtSecret);
  } catch (err){
    return null;
  }
}

function setAuthCookie(res, token){
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res){
  res.clearCookie(COOKIE_NAME);
}

// Comprueba el token y, si quien pregunta tiene sección propia (tenantId),
// engancha también `req.db`: el objeto de SU sección (y solo la suya). El
// resto de rutas (roster, sanciones, rebajes, refuerzos, usuarios...) leen
// y escriben siempre a través de `req.db`, nunca de `db.data` directamente,
// así que es físicamente imposible que una petición toque los datos de una
// sección que no es la suya. Un Súper Administrador sin sección propia
// (tenantId null) simplemente no tiene `req.db` — solo puede usar las rutas
// de /api/superadmin, protegidas con requireSuperAdmin.
function requireAuth(req, res, next){
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;
  if (!payload){
    return res.status(401).json({ error: "No autenticado." });
  }
  req.user = payload;

  if (payload.tenantId){
    const t = db.tenant(payload.tenantId);
    if (!t){
      return res.status(401).json({ error: "Tu sección ya no existe o ha sido eliminada. Contacta con el Súper Administrador." });
    }
    req.db = t;
  }
  next();
}

function requireRole(role){
  return function (req, res, next){
    if (!req.user || req.user.role !== role){
      return res.status(403).json({ error: "No tienes permiso para esta acción." });
    }
    next();
  };
}

// Para las rutas de /api/superadmin: exige el permiso `superAdmin`, sea
// cual sea el rol que esa misma persona tenga (o no) en su propia sección.
function requireSuperAdmin(req, res, next){
  if (!req.user || !req.user.superAdmin){
    return res.status(403).json({ error: "No tienes permiso para esta acción." });
  }
  next();
}

// Permisos adicionales que el jefe de sección puede conceder a un jefe de
// pelotón en concreto (además de lo esencial, que es dar de alta sanciones/
// amonestaciones, siempre permitido para cualquiera con rol "instructor").
const PERMISOS_KEYS = ["fotos", "verFicha", "adjuntos", "verRebajesRefuerzos"];

function normalizePermisos(p){
  const out = {};
  PERMISOS_KEYS.forEach(function (k){
    out[k] = !!(p && p[k]);
  });
  return out;
}

// Siempre relee el usuario desde la base de datos (en vez de fiarse del
// token) para que, si el jefe de sección revoca un permiso, deje de
// aplicarse en la siguiente petición sin esperar a que caduque el token.
function getFreshUser(req){
  if (!req.user || !req.db) return null;
  return req.db.users.find(function (u){ return u.dni === req.user.dni; }) || null;
}

function requirePermiso(key){
  return function (req, res, next){
    if (!req.user) return res.status(401).json({ error: "No autenticado." });
    if (req.user.role === "admin") return next();
    const user = getFreshUser(req);
    if (user && user.role === "instructor" && user.permisos && user.permisos[key]){
      return next();
    }
    return res.status(403).json({ error: "No tienes permiso para esta acción." });
  };
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  normalizeDni,
  issueToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  requireRole,
  requireSuperAdmin,
  PERMISOS_KEYS,
  normalizePermisos,
  getFreshUser,
  requirePermiso
};
