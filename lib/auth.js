const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const COOKIE_NAME = "cefot2_token";
const TOKEN_TTL = "12h";
const USUARIO_RE = /^[A-ZÑ0-9][A-ZÑ0-9._-]{2,19}$/;

function hashPassword(plain){ return bcrypt.hashSync(plain, 10); }
function verifyPassword(plain, hash){ return bcrypt.compareSync(plain, hash); }
function normalizeDni(dni){ return String(dni || "").trim().toUpperCase().replace(/\s+/g, "_"); }

function parseUsuario(raw){
  const value = normalizeDni(raw);
  if (!value) return { ok: false, error: "El usuario es obligatorio." };
  if (value.length < 3 || value.length > 20){
    return { ok: false, error: "El usuario debe tener entre 3 y 20 caracteres." };
  }
  if (!USUARIO_RE.test(value)){
    return { ok: false, error: "Formato de usuario no válido. Usa letras, números, punto, guión o _, sin espacios." };
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
// El permiso de Súper Administrador sale SOLO del campo `superAdmin` del
// usuario guardado en el servidor (lo rellena requireAuth en cada petición).
// Antes bastaba con llamarse "SUPERADMIN": cualquier jefe de sección podía
// crear un usuario con ese DNI y obtener acceso total.
function isSuperAdminUser(user){
  return !!(user && user.superAdmin === true);
}

// Identificadores que nadie puede usar al dar de alta o renombrar usuarios.
const DNIS_RESERVADOS = ["SUPERADMIN", "ADMIN", "ROOT", "ADMINISTRADOR"];
function dniReservado(dni){
  return DNIS_RESERVADOS.indexOf(normalizeDni(dni)) !== -1;
}
function canSeeFullDni(req){ return !!(req && req.user && isSuperAdminUser(req.user)); }
function publicDni(req, dni){ return canSeeFullDni(req) ? normalizeDni(dni) : maskDni(dni); }

function issueToken(user, role, tenantId, superAdmin, capitanCompania, jefeEstudios){
  const dni = user.dni;
  return jwt.sign(
    {
      dni: dni,
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
  // Los permisos se vuelven a leer del servidor en CADA petición: si el
  // usuario ha sido eliminado, su sesión deja de valer al momento (antes
  // seguía funcionando hasta 12 horas con la cookie antigua).
  const fresh = db.findUserGlobal(payload.dni);
  if (!fresh){
    clearAuthCookie(res);
    return res.status(401).json({ error: "Tu usuario ya no existe o ha sido dado de baja. Contacta con tu jefe de sección." });
  }
  req.user.nombre = fresh.user.nombre;
  req.user.superAdmin = !!fresh.superAdmin;
  req.user.jefeEstudios = !!fresh.jefeEstudios;
  req.user.capitanCompania = fresh.capitanCompania != null ? Number(fresh.capitanCompania) : null;
  if (fresh.role) req.user.role = fresh.role;
  if (fresh.tenantId) req.user.tenantId = fresh.tenantId;
  // Un capitán solo puede estar "dentro" de secciones de SU compañía; si ya
  // no es capitán (o cambió de compañía), pierde el acceso a esa sección.
  if (!fresh.tenantId && payload.tenantId){
    const cia = parseInt(String(payload.tenantId).split("-")[0], 10);
    if (!req.user.capitanCompania || cia !== req.user.capitanCompania){
      clearAuthCookie(res);
      return res.status(401).json({ error: "Ya no tienes acceso a esa sección. Vuelve a iniciar sesión." });
    }
  }
  if (req.user.tenantId){
    const t = db.tenant(req.user.tenantId);
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
  if (!req.user || !isSuperAdminUser(req.user)){
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
  if (!req.user || !(req.user.jefeEstudios || isSuperAdminUser(req.user))){
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
  maskDni, looksMaskedDni, canSeeFullDni, publicDni, isSuperAdminUser, dniReservado,
  issueToken, verifyToken, setAuthCookie, clearAuthCookie,
  requireAuth, requireRole, requireSuperAdmin, requireCapitan, requireJefeEstudios, blockCapitan,
  PERMISOS_KEYS, normalizePermisos, getFreshUser, requirePermiso
};
