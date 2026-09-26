const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");
const mailer = require("../lib/mailer");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CONTACTOS = 15;
const MAX_ENVIOS_HISTORIAL = 20;

function normalizarEmail(raw){
  return String(raw || "").trim().toLowerCase();
}

function publicUser(u){
  return {
    dni: u.dni,
    nombre: u.nombre,
    role: u.role,
    createdAt: u.createdAt,
    permisos: auth.normalizePermisos(u.permisos)
  };
}

// Copia de seguridad de solo lectura: descarga todo el contenido actual de
// ESTA sección (roster, bajas, sanciones, rebajes, refuerzos, actividades y
// horas UA) en un único JSON. No incluye contraseñas.
router.get("/backup", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const snapshot = db.buildBackupSnapshot(req.db);
  res.setHeader("Content-Disposition", "attachment; filename=cefot2_copia_seguridad.json");
  res.json(snapshot);
});

// ---------------- copia de seguridad por email ----------------

// Direcciones guardadas ("filtro") para no tener que volver a teclearlas
// cada vez que se envía la copia de seguridad, más el historial reciente de
// envíos (para trazabilidad: son datos personales de los alumnos).
router.get("/backup-contactos", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureBackupShape(req.db);
  res.json({ contactos: req.db.backupContactos, envios: req.db.backupEnvios });
});

router.post("/backup-contactos", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  db.ensureBackupShape(req.db);
  const email = normalizarEmail(req.body && req.body.email);
  if (!EMAIL_RE.test(email)){
    return res.status(400).json({ error: "Dirección de correo no válida." });
  }
  const yaExiste = req.db.backupContactos.some(function (c){ return c.email === email; });
  if (!yaExiste){
    if (req.db.backupContactos.length >= MAX_CONTACTOS){
      return res.status(400).json({ error: "Ya hay " + MAX_CONTACTOS + " direcciones guardadas; elimina alguna antes de añadir otra." });
    }
    req.db.backupContactos.push({ email: email, addedAt: new Date().toISOString() });
    db.save();
  }
  res.status(201).json({ ok: true, contactos: req.db.backupContactos });
});

router.delete("/backup-contactos/:email", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  db.ensureBackupShape(req.db);
  const email = normalizarEmail(decodeURIComponent(req.params.email));
  const before = req.db.backupContactos.length;
  req.db.backupContactos = req.db.backupContactos.filter(function (c){ return c.email !== email; });
  if (req.db.backupContactos.length !== before) db.save();
  res.json({ ok: true, contactos: req.db.backupContactos });
});

// Genera la copia de seguridad ampliada y la envía por correo a UNA
// dirección. Si `guardarContacto` es verdadero (o si es la única vez que se
// usa esa dirección) se guarda además como contacto para próximos envíos.
router.post("/backup/enviar", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, async function (req, res){
  db.ensureBackupShape(req.db);
  const email = normalizarEmail(req.body && req.body.email);
  if (!EMAIL_RE.test(email)){
    return res.status(400).json({ error: "Dirección de correo no válida." });
  }
  const guardarContacto = !!(req.body && req.body.guardarContacto);

  const snapshot = db.buildBackupSnapshot(req.db);
  const nombreSeccion = req.db.nombre || ("Sección " + req.db.seccion);
  const fechaLegible = new Date().toLocaleString("es-ES");

  try {
    await mailer.enviarCopiaSeguridad({
      to: email,
      remitenteNombre: "CEFOT-2 · " + nombreSeccion,
      asunto: "Copia de seguridad — " + nombreSeccion + " (" + fechaLegible + ")",
      textoPlano:
        "Copia de seguridad de " + nombreSeccion + ", generada el " + fechaLegible + ".\n\n" +
        "Contiene: roster (" + snapshot.roster.length + " alumnos activos, " + snapshot.bajas.length + " de baja), " +
        snapshot.sanciones.length + " sanciones, " + snapshot.rebajes.length + " rebajes, " +
        snapshot.refuerzos.length + " refuerzos y " + snapshot.actividades.length + " actividades.\n\n" +
        "Este correo contiene datos personales de los alumnos: consérvalo únicamente en un dispositivo de confianza.\n\n" +
        "Enviado por " + req.user.nombre + " (" + req.user.dni + ") desde la aplicación CEFOT-2.",
      adjuntoNombre: "cefot2_copia_seguridad_" + req.db.compania + "-" + req.db.seccion + ".json",
      adjuntoJson: snapshot
    });
  } catch (err){
    const mensaje = err && err.code === "SMTP_NOT_CONFIGURED"
      ? err.message
      : "No se ha podido enviar el correo. Comprueba la dirección y vuelve a intentarlo en unos minutos.";
    return res.status(502).json({ error: mensaje });
  }

  const envio = {
    fecha: new Date().toISOString(),
    email: email,
    enviadoPor: { dni: req.user.dni, nombre: req.user.nombre }
  };
  req.db.backupEnvios.unshift(envio);
  req.db.backupEnvios = req.db.backupEnvios.slice(0, MAX_ENVIOS_HISTORIAL);

  if (guardarContacto && !req.db.backupContactos.some(function (c){ return c.email === email; })){
    if (req.db.backupContactos.length < MAX_CONTACTOS){
      req.db.backupContactos.push({ email: email, addedAt: new Date().toISOString() });
    }
  }
  db.save();

  res.json({ ok: true, envio: envio, contactos: req.db.backupContactos, envios: req.db.backupEnvios });
});

// Resumen para la pantalla de "Cerrar curso": cuántos registros hay ahora
// mismo (para que el jefe de sección sepa qué va a borrar antes de
// confirmar) y el historial de cierres anteriores (quién, cuándo, cuántos
// registros). Todo referido siempre a la sección de quien pregunta.
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

// Cierra el curso académico de ESTA sección: vacía sanciones, rebajes y
// refuerzos (siempre) y, si se pide explícitamente, también el roster
// completo. No afecta a ninguna otra sección.
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
  req.db.cursosHistorial = req.db.cursosHistorial.slice(0, 20); // no crecer sin límite

  try {
    await db.saveStrict();
  } catch (err){
    return res.status(500).json({ error: "No se ha podido guardar el cierre de curso (fallo al escribir en la base de datos); no se ha confirmado nada, vuelve a intentarlo en unos segundos." });
  }
  res.json({ ok: true, resumen: resumen });
});

// Usuarios de ESTA sección: siempre jefes de pelotón (rol "instructor"). El
// jefe de sección en sí mismo no aparece aquí ni se gestiona desde esta
// pantalla — eso lo da de alta el Súper Administrador.
router.get("/usuarios", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const usuarios = req.db.users.filter(function (u){ return u.role === "instructor"; }).map(publicUser);
  res.json({ usuarios: usuarios });
});

router.post("/usuarios", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  const dni = auth.normalizeDni(req.body.dni);
  const nombre = String(req.body.nombre || "").trim();
  const password = String(req.body.password || "");
  // Un jefe de sección solo puede dar de alta jefes de pelotón: no puede
  // crear otro jefe de sección ni, por supuesto, un Súper Administrador.
  // Eso es tarea exclusiva del panel del Súper Administrador.
  const role = "instructor";
  if (auth.dniReservado(dni)) return res.status(400).json({ error: "Ese identificador está reservado; elige otro." });

  if (!dni || !nombre || password.length < 6){
    return res.status(400).json({ error: "DNI, nombre y una contraseña de al menos 6 caracteres son obligatorios." });
  }
  // El DNI tiene que ser único en TODO el sistema (no solo en esta
  // sección), porque el inicio de sesión busca por DNI sin saber todavía a
  // qué sección pertenece.
  if (db.findUserGlobal(dni)){
    return res.status(409).json({ error: "Ya existe un usuario con ese DNI (en esta u otra sección)." });
  }

  const user = {
    dni: dni,
    nombre: nombre,
    role: role,
    passwordHash: auth.hashPassword(password),
    // Permisos extra (además de sanciones, siempre permitidas para
    // cualquier jefe de pelotón): solo tienen efecto si role === "instructor".
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

// Cambia los permisos extra (foto, ver ficha, adjuntos, ver rebajes/
// refuerzos) de un jefe de pelotón. Dar de alta sanciones sigue siendo
// siempre posible para cualquiera de ellos, no depende de estos permisos.
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
