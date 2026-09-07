// Actividades de las fases FFMG/FFE (marchas, tiros, exámenes, jura de
// bandera...) de una sección: catálogo de actividades y, para cada una,
// quién participó. Vive en el servidor igual que sanciones/rebajes/
// refuerzos (compartido por todos los que entran en la sección), no en el
// navegador de cada uno. Solo el jefe de sección (o un capitán de compañía
// actuando en la sección, vía token-swap) lo gestiona.
const express = require("express");
const crypto = require("crypto");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();

const FASES = ["FFMG", "FFE"];

// Lista TODAS las actividades de la sección (de ambas fases; el cliente
// filtra por fase). La primera vez que se pide cada fase, si no tiene
// ninguna actividad todavía, se precarga su catálogo estándar.
router.get("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureActividadesShape(req.db);
  let cambiado = false;
  FASES.forEach(function (fase){
    if (db.seedActividadesFaseIfNeeded(req.db, fase)) cambiado = true;
  });
  if (cambiado) db.save();
  res.json({ actividades: req.db.actividades });
});

router.post("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureActividadesShape(req.db);
  const fase = req.body && req.body.fase;
  const nombre = req.body && String(req.body.nombre || "").trim();
  const fecha = req.body && req.body.fecha ? String(req.body.fecha) : "";

  if (FASES.indexOf(fase) === -1){
    return res.status(400).json({ error: "Fase inválida." });
  }
  if (!nombre){
    return res.status(400).json({ error: "Escribe un nombre para la actividad." });
  }

  const deEstaFase = req.db.actividades.filter(function (a){ return a.fase === fase; });
  const orden = deEstaFase.length
    ? Math.max.apply(null, deEstaFase.map(function (a){ return a.orden || 0; })) + 1
    : 1;

  const actividad = {
    id: crypto.randomUUID(),
    fase: fase,
    nombre: nombre.toUpperCase(),
    orden: orden,
    fecha: fecha,
    participantes: [],
    createdAt: new Date().toISOString()
  };
  req.db.actividades.push(actividad);
  db.save();
  res.status(201).json({ ok: true, actividad: actividad });
});

// Edita la fecha y/o la lista de participantes (números de protocolo) de
// una actividad ya existente. Ambos campos son opcionales — solo se cambia
// lo que se envíe.
router.patch("/:id", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureActividadesShape(req.db);
  const actividad = req.db.actividades.find(function (a){ return a.id === req.params.id; });
  if (!actividad) return res.status(404).json({ error: "Actividad no encontrada." });

  const b = req.body || {};
  if (b.fecha !== undefined){
    actividad.fecha = b.fecha ? String(b.fecha) : "";
  }
  if (b.participantes !== undefined){
    if (!Array.isArray(b.participantes)){
      return res.status(400).json({ error: "Lista de participantes inválida." });
    }
    actividad.participantes = b.participantes.map(function (n){ return String(n); });
  }
  db.save();
  res.json({ ok: true, actividad: actividad });
});

router.delete("/:id", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  db.ensureActividadesShape(req.db);
  const before = req.db.actividades.length;
  req.db.actividades = req.db.actividades.filter(function (a){ return a.id !== req.params.id; });
  if (req.db.actividades.length === before){
    return res.status(404).json({ error: "Actividad no encontrada." });
  }
  db.save();
  res.json({ ok: true });
});

module.exports = router;
