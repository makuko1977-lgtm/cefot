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
const arrestos = require("../lib/arrestos");

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

// ---------------- arrestos para su curso administrativo ----------------
// Las secciones creadas de la compañía del capitán, como [{ id, t }].
function seccionesDeCompania(compania){
  const out = [];
  for (let seccion = 1; seccion <= 5; seccion++){
    const id = db.tenantKey(compania, seccion);
    const t = db.tenant(id);
    if (t) out.push({ id: id, t: t });
  }
  return out;
}

function vistaArresto(id, t, s){
  return {
    tenantId: id,
    seccion: t.seccion,
    seccionNombre: t.nombre,
    sancionId: s.id,
    expediente: s.expediente,
    fecha: s.fecha || "", hora: s.hora || "", lugar: s.lugar || "",
    tipoFalta: s.tipoFalta || "", fundamento: s.fundamento || "", fundamentoLetra: s.fundamentoLetra || "",
    fase: s.fase || "",
    motivo: s.motivo || "", observaciones: s.observaciones || "",
    profEmpleo: s.profEmpleo || "", profNombre: s.profNombre || "", profApellidos: s.profApellidos || "", profDni: s.profDni || "",
    arrestoFechaIni: s.arrestoFechaIni || "", arrestoFechaFin: s.arrestoFechaFin || "",
    arrestoDias: s.arrestoDias || "", arrestoPendiente: !!s.arrestoPendiente,
    createdAt: s.createdAt || null,
    createdBy: s.createdBy ? { nombre: s.createdBy.nombre, role: s.createdBy.role } : null,
    medidaRevisadaPor: s.medidaRevisadaPor ? { nombre: s.medidaRevisadaPor.nombre, at: s.medidaRevisadaPor.at } : null,
    capitan: s.capitan,
    alumnos: (s.alumnos || []).map(function (a){
      return {
        numero: a.numero, ape1: a.ape1 || "", ape2: a.ape2 || "", nombre: a.nombre || "", peloton: a.peloton || "",
        antecedentes: arrestos.antecedentes(t, a.numero, s)
      };
    })
  };
}

// Pendientes y tramitados de toda la compañía (para la ventana de avisos y
// para el historial filtrable del capitán).
router.get("/arrestos", auth.requireAuth, auth.requireCapitan, function (req, res){
  const lista = [];
  seccionesDeCompania(req.user.capitanCompania).forEach(function (x){
    (x.t.sanciones || []).forEach(function (s){
      if (s.medidaCorrectora === "Arresto" && s.capitan) lista.push(vistaArresto(x.id, x.t, s));
    });
  });
  lista.sort(function (a, b){ return String(b.capitan.enviadoAt || "").localeCompare(String(a.capitan.enviadoAt || "")); });
  res.json({
    compania: req.user.capitanCompania,
    pendientes: lista.filter(function (a){ return a.capitan.estado === "pendiente"; }),
    tramitados: lista.filter(function (a){ return a.capitan.estado === "tramitado"; })
  });
});

function buscarArresto(req, res){
  const tenantId = String(req.params.tenantId || "");
  if (parseInt(tenantId.split("-")[0], 10) !== Number(req.user.capitanCompania)){
    res.status(403).json({ error: "Esa sección no pertenece a tu compañía." });
    return null;
  }
  const t = db.tenant(tenantId);
  const s = t && (t.sanciones || []).find(function (x){ return x.id === req.params.sancionId; });
  if (!s || s.medidaCorrectora !== "Arresto" || !s.capitan){
    res.status(404).json({ error: "No se encuentra ese arresto." });
    return null;
  }
  return { t: t, s: s };
}

router.post("/arrestos/:tenantId/:sancionId/tramitar", auth.requireAuth, auth.requireCapitan, function (req, res){
  const x = buscarArresto(req, res); if (!x) return;
  x.s.capitan.estado = "tramitado";
  x.s.capitan.tramitadoAt = new Date().toISOString();
  x.s.capitan.tramitadoPor = { dni: req.user.dni, nombre: req.user.nombre };
  db.save();
  res.json({ ok: true, capitan: x.s.capitan });
});

router.post("/arrestos/:tenantId/:sancionId/reabrir", auth.requireAuth, auth.requireCapitan, function (req, res){
  const x = buscarArresto(req, res); if (!x) return;
  x.s.capitan.estado = "pendiente";
  delete x.s.capitan.tramitadoAt;
  delete x.s.capitan.tramitadoPor;
  db.save();
  res.json({ ok: true, capitan: x.s.capitan });
});

// Consulta de un alumno por su número de protocolo en cualquier sección de
// la compañía: datos básicos, antecedentes y su historial completo (el mismo
// que ve su jefe de sección: rebajes, sanciones y refuerzos).
router.get("/alumno/:numero", auth.requireAuth, auth.requireCapitan, function (req, res){
  const num = String(req.params.numero || "").trim();
  if (!num) return res.status(400).json({ error: "Indica el número de protocolo." });
  const encontrados = [];
  seccionesDeCompania(req.user.capitanCompania).forEach(function (x){
    const t = x.t;
    let al = (t.roster || []).find(function (a){ return String(a.numero) === num; });
    let baja = false;
    if (!al){ al = (t.bajas || []).find(function (a){ return String(a.numero) === num; }); baja = !!al; }
    const sanciones = (t.sanciones || []).filter(function (s){
      return (s.alumnos || []).some(function (a){ return String(a.numero) === num; });
    });
    if (!al && !sanciones.length) return;
    if (!al){
      const a0 = sanciones[0].alumnos.find(function (a){ return String(a.numero) === num; });
      al = { numero: num, ape1: a0.ape1, ape2: a0.ape2, nombre: a0.nombre, peloton: a0.peloton };
    }
    const ordenar = function (a, b){ return String(b.fecha || b.fechaInicio || "").localeCompare(String(a.fecha || a.fechaInicio || "")); };
    encontrados.push({
      tenantId: x.id, seccion: t.seccion, seccionNombre: t.nombre, baja: baja,
      alumno: { numero: al.numero, ape1: al.ape1 || "", ape2: al.ape2 || "", nombre: al.nombre || "", peloton: al.peloton || "", unidad: al.unidad || "" },
      antecedentes: arrestos.antecedentes(t, num, null),
      historial: {
        sanciones: sanciones.slice().sort(ordenar).map(function (s){
          return {
            expediente: s.expediente, fecha: s.fecha, hora: s.hora, lugar: s.lugar, tipoFalta: s.tipoFalta,
            fundamento: s.fundamento, fundamentoLetra: s.fundamentoLetra, motivo: s.motivo, observaciones: s.observaciones,
            profEmpleo: s.profEmpleo, profNombre: s.profNombre, profApellidos: s.profApellidos,
            medidaCorrectora: s.medidaCorrectora, arrestoFechaIni: s.arrestoFechaIni, arrestoFechaFin: s.arrestoFechaFin,
            arrestoDias: s.arrestoDias, arrestoPendiente: !!s.arrestoPendiente, trabajoFechaFin: s.trabajoFechaFin,
            numAlumnos: (s.alumnos || []).length, capitan: s.capitan || null
          };
        }),
        rebajes: (t.rebajes || []).filter(function (r){ return String(r.numero) === num; }).sort(ordenar)
          .map(function (r){ return { fechaInicio: r.fechaInicio, fechaFin: r.fechaFin, total: !!r.total, categorias: r.categorias || {} }; }),
        refuerzos: (t.refuerzos || []).filter(function (r){ return (r.alumnos || []).some(function (a){ return String(a.numero) === num; }); }).sort(ordenar)
          .map(function (r){ return { fechaInicio: r.fechaInicio, fechaFin: r.fechaFin, tipo: r.tipo, horaInicio: r.horaInicio, duracion: r.duracion, origen: r.origen, expediente: r.expediente, motivo: r.motivo }; })
      }
    });
  });
  if (!encontrados.length) return res.status(404).json({ error: "No hay ningún alumno con el número " + num + " en las secciones de tu compañía." });
  res.json({ resultados: encontrados });
});

module.exports = router;
