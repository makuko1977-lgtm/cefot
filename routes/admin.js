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

function pick(row, names){
  if (!row || typeof row !== "object") return "";
  const keys = Object.keys(row);
  for (let i = 0; i < names.length; i++){
    const want = String(names[i]).trim().toUpperCase();
    for (let k = 0; k < keys.length; k++){
      if (String(keys[k]).trim().toUpperCase() === want){
        const v = row[keys[k]];
        return v == null ? "" : String(v);
      }
    }
  }
  return "";
}

function canonRosterRow(row){
  if (!row || typeof row !== "object") return null;
  const numero = pick(row, ["numero", "NUMERO", "NÚMERO", "Nº", "PROTOCOLO", "Nº PROTOCOLO"]);
  if (!numero) return null;
  const out = {
    numero: numero,
    ape1: pick(row, ["ape1", "APE1", "APELLIDO", "APELLIDOS", "PRIMER APELLIDO"]),
    ape2: pick(row, ["ape2", "APE2", "SEGUNDO APELLIDO"]),
    nombre: pick(row, ["nombre", "NOMBRE"]),
    peloton: pick(row, ["peloton", "PELOTON", "PELOTÓN"]),
    sexo: pick(row, ["sexo", "SEXO"]),
    unidad: pick(row, ["unidad", "UNIDAD"]),
    dni: pick(row, ["dni", "DNI"]),
    telefono: pick(row, ["telefono", "TELEFONO", "TELÉFONO", "TEL"])
  };
  if (row._foto) out._foto = row._foto;
  if (row._adjuntos) out._adjuntos = row._adjuntos;
  if (row._cuestionario) out._cuestionario = row._cuestionario;
  if (row._cuestionarioFecha) out._cuestionarioFecha = row._cuestionarioFecha;
  return out;
}

function extraerRoster(payload){
  if (!payload) return [];
  if (Array.isArray(payload.roster)) return payload.roster;
  if (payload.roster && Array.isArray(payload.roster.rows)) return payload.roster.rows;
  if (Array.isArray(payload.rosterCanonico)) return payload.rosterCanonico;
  return [];
}

function snapshotSeccion(req){
  const roster = req.db.roster || [];
  const rows = roster.map(function (r){
    return {
      NUMERO: r.numero, APE1: r.ape1, APE2: r.ape2, NOMBRE: r.nombre,
      PELOTON: r.peloton, SEXO: r.sexo, UNIDAD: r.unidad, DNI: r.dni, TELEFONO: r.telefono,
      numero: r.numero, ape1: r.ape1, ape2: r.ape2, nombre: r.nombre,
      peloton: r.peloton, sexo: r.sexo, unidad: r.unidad, dni: r.dni, telefono: r.telefono
    };
  });
  return {
    tipo: "seccion3_backup",
    version: 2,
    exportadoEl: new Date().toISOString(),
    exportedAt: new Date().toISOString(),
    seccion: { compania: req.db.compania, seccion: req.db.seccion, nombre: req.db.nombre },
    roster: {
      headers: ["NUMERO", "APE1", "APE2", "NOMBRE", "PELOTON", "SEXO", "UNIDAD", "DNI", "TELEFONO"],
      rows: rows,
      meta: { origen: "servidor", count: rows.length }
    },
    rosterCanonico: roster,
    sanciones: req.db.sanciones || [],
    rebajes: req.db.rebajes || [],
    refuerzos: req.db.refuerzos || [],
    actividades: req.db.actividades || [],
    expedienteCounter: req.db.expedienteCounter || 0
  };
}

router.get("/backup", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const snapshot = snapshotSeccion(req);
  res.setHeader("Content-Disposition", "attachment; filename=cefot2_copia_seguridad.json");
  res.json(snapshot);
});

// Restaura una copia exportada desde el servidor o desde el HTML local
// (tipo seccion3_backup). Sustituye roster/sanciones/rebajes/refuerzos/
// actividades de ESTA sección. No toca usuarios ni otras secciones.
router.post("/backup", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, async function (req, res){
  const CONFIRMACION = "RESTAURAR";
  const b = req.body || {};
  if (String(b.confirmacion || "").trim() !== CONFIRMACION){
    return res.status(400).json({ error: "Escribe RESTAURAR para confirmar. Esto sustituye los datos de la sección." });
  }
  const payload = b.copia && typeof b.copia === "object" ? b.copia : b;
  const rawRoster = extraerRoster(payload);
  if (!Array.isArray(rawRoster) && !Array.isArray(payload.sanciones) && !Array.isArray(payload.rebajes)){
    return res.status(400).json({ error: "El archivo no parece una copia de seguridad de Sección 3 ni del servidor." });
  }

  const roster = rawRoster.map(canonRosterRow).filter(Boolean);
  const sanciones = Array.isArray(payload.sanciones) ? payload.sanciones : [];
  const rebajes = Array.isArray(payload.rebajes) ? payload.rebajes : [];
  const refuerzos = Array.isArray(payload.refuerzos) ? payload.refuerzos : [];
  const actividades = Array.isArray(payload.actividades) ? payload.actividades : [];

  let maxExp = 0;
  sanciones.forEach(function (s){
    const n = parseInt(s && s.expediente, 10);
    if (!isNaN(n) && n > maxExp) maxExp = n;
  });
  refuerzos.forEach(function (s){
    const n = parseInt(s && s.expediente, 10);
    if (!isNaN(n) && n > maxExp) maxExp = n;
  });
  const counterIn = parseInt(payload.expedienteCounter, 10);
  const expedienteCounter = Math.max(maxExp, isNaN(counterIn) ? 0 : counterIn, req.db.expedienteCounter || 0);

  req.db.roster = roster;
  req.db.rosterUpdatedAt = new Date().toISOString();
  req.db.rosterUpdatedBy = req.user.dni;
  req.db.sanciones = sanciones;
  req.db.rebajes = rebajes;
  req.db.refuerzos = refuerzos;
  req.db.actividades = actividades;
  req.db.expedienteCounter = expedienteCounter;

  try {
    await db.saveStrict();
  } catch (err){
    return res.status(500).json({ error: "No se ha podido guardar la restauración. Inténtalo de nuevo." });
  }

  res.json({
    ok: true,
    restaurado: {
      roster: roster.length,
      sanciones: sanciones.length,
      rebajes: rebajes.length,
      refuerzos: refuerzos.length,
      actividades: actividades.length,
      expedienteCounter: expedienteCounter
    }
  });
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
