const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const COOKIE_NAME = "cefot2_token";
const TOKEN_TTL = "12h";
const USUARIO_RE = /^[A-ZÑ0-9][A-ZÑ0-9._-]{2,19}$/;

function hashPassword(plain){ return bcrypt.hashSync(plain, 10); }
function verifyPassword(plain, hash){ return bcrypt.compareSync(plain, hash); }
function normalizeDni(dni){ return String(dni || "").trim().toUpperCase(); }

function parseUsuario(raw){
  const value = normalizeDni(raw);
  if (!value) return { ok: false, error: "El usuario es obligatorio." };
  if (value.length < 3 || value.length > 20){
    return { ok: false, error: "El usuario debe tener entre 3 y 20 caracteres." };
  }
  if (!USUARIO_RE.test(value)){
    return { ok: false, error: "Formato de usuario no válido. Usa letras, números, punto, guión o _, sin espacios, empezando por letra o número." };
  }
  return { ok: true, value: value };
}

function maskDni(dni){
  const s = normalizeDni(dni);
  if (!s) return "";
  if (s.length <= 3) return "•".repeat(s.length);
  return "•".repeat(s.length - 3) + s.slice(-3);
}
function looksMaskedDni(dni){ return /[•*]/.test(String(dni || "")); }
function canSeeFullDni(req){ return !!(req && req.user && req.user.superAdmin); }
function publicDni(req, dni){ return canSeeFullDni(req) ? normalizeDni(dni) : maskDni(dni); }

function issueToken(user, role, tenantId, superAdmin, capitanCompania, jefeEstudios){
  return jwt.sign(
    {
      dni: user.dni,
      role: role || null,
      nombre: user.nombre,
      tenantId: tenantId || null,
      superAdmin: !!superAdmin,
      capitanCompania: capitanCompania != null ? Number(capitanCompania) : null,
      jefeEstudios: !!jefeEstudios
    },
    db.data.jwtSecret,
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token){
  try { return jwt.verify(token, db.data.jwtSecret); }
  catch (err){ return null; }
}
function setAuthCookie(res, token){
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 60 * 60 * 1000
  });
}
function clearAuthCookie(res){ res.clearCookie(COOKIE_NAME); }

function requireAuth(req, res, next){
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: "No autenticado." });
  req.user = payload;
  if (payload.tenantId){
    const t = db.tenant(payload.tenantId);
    if (!t) return res.status(401).json({ error: "Tu sección ya no existe o ha sido eliminada. Contacta con el Súper Administrador." });
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
function requireSuperAdmin(req, res, next){
  if (!req.user || !req.user.superAdmin){
    return res.status(403).json({ error: "No tienes permiso para esta acción." });
  }
  next();
}
function requireCapitan(req, res, next){
  if (!req.user || !req.user.capitanCompania){
    return res.status(403).json({ error: "No tienes permiso para esta acción." });
  }
  next();
}
function requireJefeEstudios(req, res, next){
  if (!req.user || !(req.user.jefeEstudios || req.user.superAdmin)){
    return res.status(403).json({ error: "No tienes permiso para esta acción." });
  }
  next();
}
function blockCapitan(req, res, next){
  if (req.user && req.user.capitanCompania){
    return res.status(403).json({ error: "Como capitán de compañía no puedes gestionar el roster ni los usuarios de la sección; eso corresponde al jefe de sección." });
  }
  next();
}

const PERMISOS_KEYS = ["fotos", "verFicha", "adjuntos", "verRebajesRefuerzos"];
function normalizePermisos(p){
  const out = {};
  PERMISOS_KEYS.forEach(function (k){ out[k] = !!(p && p[k]); });
  return out;
}
function getFreshUser(req){
  if (!req.user || !req.db) return null;
  return req.db.users.find(function (u){ return u.dni === req.user.dni; }) || null;
}
function requirePermiso(key){
  return function (req, res, next){
    if (!req.user) return res.status(401).json({ error: "No autenticado." });
    if (req.user.role === "admin") return next();
    const user = getFreshUser(req);
    if (user && user.role === "instructor" && user.permisos && user.permisos[key]) return next();
    return res.status(403).json({ error: "No tienes permiso para esta acción." });
  };
}

module.exports = {
  COOKIE_NAME, hashPassword, verifyPassword, normalizeDni, parseUsuario,
  maskDni, looksMaskedDni, canSeeFullDni, publicDni,
  issueToken, verifyToken, setAuthCookie, clearAuthCookie,
  requireAuth, requireRole, requireSuperAdmin, requireCapitan, requireJefeEstudios, blockCapitan,
  PERMISOS_KEYS, normalizePermisos, getFreshUser, requirePermiso
};
