// Panel del Súper Administrador: crea las secciones (compañía 1ª-4ª ×
// sección 1ª-5ª) dando de alta a su jefe de sección, y consulta un resumen
// de solo lectura de cualquiera de ellas — sin entrar a editar sus datos.
const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();

function parseCompaniaSeccion(body){
  const compania = parseInt(body.compania, 10);
  const seccion = parseInt(body.seccion, 10);
  if (!(compania >= 1 && compania <= 4)) return null;
  if (!(seccion >= 1 && seccion <= 5)) return null;
  return { compania: compania, seccion: seccion };
}

// Lista las secciones que YA existen (creada = tiene jefe de sección dado
// de alta), con un resumen mínimo de cada una. Las casillas de la rejilla
// 4×5 que todavía no se han creado no aparecen aquí: el propio panel las
// pinta vacías comparando con esta lista.
router.get("/secciones", auth.requireAuth, auth.requireSuperAdmin, function (req, res){
  const secciones = db.listTenants().map(function (t){
    const jefe = t.users.find(function (u){ return u.role === "admin"; });
    return {
      id: t.id,
      compania: t.compania,
      seccion: t.seccion,
      nombre: t.nombre,
      jefeSeccion: jefe ? { dni: jefe.dni, nombre: jefe.nombre } : null,
      totales: {
        alumnos: t.roster.length,
        jefesDePeloton: t.users.filter(function (u){ return u.role === "instructor"; }).length,
        sanciones: t.sanciones.length,
        rebajes: t.rebajes.length,
        refuerzos: t.refuerzos.length
      },
      rosterUpdatedAt: t.rosterUpdatedAt
    };
  });
  res.json({ secciones: secciones });
});

// Resumen de solo lectura de UNA sección concreta: pensado para comprobar
// que todo va bien (posibles errores, alertas, actividad) sin entrar a
// modificar nada. No expone roster, sanciones ni ningún dato personal
// alumno a alumno — solo cifras agregadas.
router.get("/secciones/:id/resumen", auth.requireAuth, auth.requireSuperAdmin, function (req, res){
  const t = db.tenant(req.params.id);
  if (!t) return res.status(404).json({ error: "Esa sección no existe." });

  const jefe = t.users.find(function (u){ return u.role === "admin"; });
  const jefesDePeloton = t.users.filter(function (u){ return u.role === "instructor"; });
  const leves = t.sanciones.filter(function (s){ return s.tipoFalta === "LEVE"; }).length;
  const graves = t.sanciones.filter(function (s){ return s.tipoFalta === "GRAVE"; }).length;
  const sinMedida = t.sanciones.filter(function (s){ return !s.medidaCorrectora; }).length;
  const refuerzosPendientes = t.sanciones.filter(function (s){
    return s.medidaCorrectora === "Refuerzo" && !t.refuerzos.some(function (r){ return r.sancionId === s.id; });
  }).length;

  res.json({
    id: req.params.id,
    compania: t.compania,
    seccion: t.seccion,
    nombre: t.nombre,
    jefeSeccion: jefe ? { dni: jefe.dni, nombre: jefe.nombre, createdAt: jefe.createdAt } : null,
    jefesDePeloton: jefesDePeloton.map(function (u){ return { dni: u.dni, nombre: u.nombre }; }),
    roster: { total: t.roster.length, actualizadoEn: t.rosterUpdatedAt, actualizadoPor: t.rosterUpdatedBy },
    sanciones: { total: t.sanciones.length, leves: leves, graves: graves, sinMedida: sinMedida, refuerzosPendientes: refuerzosPendientes },
    rebajes: { total: t.rebajes.length },
    refuerzos: { total: t.refuerzos.length },
    cursosHistorial: t.cursosHistorial || []
  });
});

// Crea una sección nueva (si no existía ya) y da de alta a su jefe de
// sección. Si la sección ya existe, no se puede volver a crear desde aquí
// (para eso, más adelante, haría falta una acción explícita de "cambiar
// jefe de sección" — de momento, dar de baja/alta usuarios sigue siendo
// tarea del propio jefe de sección sobre SUS jefes de pelotón, nunca sobre
// sí mismo).
router.post("/secciones", auth.requireAuth, auth.requireSuperAdmin, function (req, res){
  const cs = parseCompaniaSeccion(req.body || {});
  if (!cs){
    return res.status(400).json({ error: "Compañía (1ª-4ª) o sección (1ª-5ª) fuera de rango." });
  }
  const key = db.tenantKey(cs.compania, cs.seccion);
  if (db.tenant(key)){
    return res.status(409).json({ error: "Esa sección ya existe." });
  }

  const dni = auth.normalizeDni(req.body.dni);
  const nombre = String(req.body.nombre || "").trim();
  const password = String(req.body.password || "");
  if (!dni || !nombre || password.length < 6){
    return res.status(400).json({ error: "DNI, nombre y una contraseña de al menos 6 caracteres son obligatorios." });
  }
  if (db.findUserGlobal(dni)){
    return res.status(409).json({ error: "Ya existe un usuario con ese DNI." });
  }

  const t = db.createTenant(cs.compania, cs.seccion);
  const jefe = {
    dni: dni,
    nombre: nombre,
    role: "admin",
    passwordHash: auth.hashPassword(password),
    createdAt: new Date().toISOString()
  };
  t.users.push(jefe);
  db.save();
  res.status(201).json({
    ok: true,
    seccion: { id: key, compania: cs.compania, seccion: cs.seccion, nombre: t.nombre, jefeSeccion: { dni: jefe.dni, nombre: jefe.nombre } }
  });
});

// Edita una sección ya existente: el nombre descriptivo de la sección y/o
// los datos de su jefe de sección (DNI, nombre, contraseña). Todos los
// campos son opcionales — solo se cambia lo que se envíe. Pensado para
// corregir un alta o para relevar a un jefe de sección sin tener que borrar
// y volver a crear la sección entera (lo que perdería todos sus datos).
router.patch("/secciones/:id", auth.requireAuth, auth.requireSuperAdmin, function (req, res){
  const t = db.tenant(req.params.id);
  if (!t) return res.status(404).json({ error: "Esa sección no existe." });

  const jefe = t.users.find(function (u){ return u.role === "admin"; });
  if (!jefe) return res.status(404).json({ error: "Esta sección todavía no tiene jefe de sección dado de alta." });

  const b = req.body || {};
  const errores = [];

  if (b.nombreSeccion != null && String(b.nombreSeccion).trim()){
    t.nombre = String(b.nombreSeccion).trim();
  }

  if (b.dni != null && String(b.dni).trim()){
    const nuevoDni = auth.normalizeDni(b.dni);
    if (nuevoDni !== jefe.dni){
      const existente = db.findUserGlobal(nuevoDni);
      if (existente){
        errores.push("Ya existe un usuario con ese DNI (en esta u otra sección).");
      } else {
        jefe.dni = nuevoDni;
      }
    }
  }

  if (b.nombre != null && String(b.nombre).trim()){
    jefe.nombre = String(b.nombre).trim();
  }

  if (b.password){
    const password = String(b.password);
    if (password.length < 6){
      errores.push("La nueva contraseña debe tener al menos 6 caracteres.");
    } else {
      jefe.passwordHash = auth.hashPassword(password);
    }
  }

  if (errores.length){
    return res.status(400).json({ error: errores.join(" ") });
  }

  db.save();
  res.json({
    ok: true,
    seccion: {
      id: req.params.id,
      compania: t.compania,
      seccion: t.seccion,
      nombre: t.nombre,
      jefeSeccion: { dni: jefe.dni, nombre: jefe.nombre }
    }
  });
});

// Elimina una sección entera: su jefe de sección, sus jefes de pelotón y
// todos sus datos (roster, sanciones, rebajes, refuerzos). Irreversible, por
// eso exige escribir literalmente la frase de confirmación — el mismo
// patrón que ya usa el jefe de sección para "Cerrar curso académico".
router.delete("/secciones/:id", auth.requireAuth, auth.requireSuperAdmin, async function (req, res){
  const t = db.tenant(req.params.id);
  if (!t) return res.status(404).json({ error: "Esa sección no existe." });

  const CONFIRMACION = "ELIMINAR SECCION";
  if (String(req.body && req.body.confirmacion || "").trim() !== CONFIRMACION){
    return res.status(400).json({ error: "Falta confirmar la acción escribiendo exactamente «" + CONFIRMACION + "»." });
  }

  db.deleteTenant(req.params.id);
  try {
    await db.saveStrict();
  } catch (err){
    return res.status(500).json({ error: "No se ha podido guardar la eliminación (fallo al escribir en la base de datos); no se ha confirmado nada, vuelve a intentarlo en unos segundos." });
  }
  res.json({ ok: true });
});

module.exports = router;
