// Programas semanales (v48): lo leído de cada programa semanal en Excel
// (semana, franjas con IFM y correcciones a mano). Nunca el archivo.
// Mismo formato que el HTML local (clave «seccion3_programas_v1»):
//   programasSemanales: [{ id, ini, fin, archivo, cargadoEl, secciones, celdas, avisos, cambios }]
// El cliente guarda la lista entera de la sección cada vez que la cambia
// (cargar, quitar una semana o corregir una celda a mano).
const express = require("express");
const db = require("../lib/db");
const auth = require("../lib/auth");

const router = express.Router();
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PROGRAMAS = 200;

function asegurar(t){
  if (!Array.isArray(t.programasSemanales)) t.programasSemanales = [];
}

function valido(p){
  return p && typeof p === "object" && !Array.isArray(p) &&
    typeof p.id === "string" && p.id && p.id.length <= 80 &&
    FECHA_RE.test(String(p.ini || "")) && FECHA_RE.test(String(p.fin || "")) &&
    (p.celdas === undefined || Array.isArray(p.celdas));
}

router.get("/", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  asegurar(req.db);
  res.json({ programas: req.db.programasSemanales });
});

router.put("/", auth.requireAuth, auth.requireRole("admin"), auth.blockCapitan, function (req, res){
  asegurar(req.db);
  const lista = req.body && req.body.programas;
  if (!Array.isArray(lista)) return res.status(400).json({ error: "Faltan los programas." });
  if (lista.length > MAX_PROGRAMAS) return res.status(400).json({ error: "Demasiados programas (máximo " + MAX_PROGRAMAS + ")." });
  if (!lista.every(valido)) return res.status(400).json({ error: "Algún programa no tiene un formato válido." });
  const ids = {};
  for (const p of lista){
    if (ids[p.id]) return res.status(400).json({ error: "Programa repetido." });
    ids[p.id] = true;
  }
  req.db.programasSemanales = lista;
  db.save();
  res.json({ ok: true, total: lista.length });
});

module.exports = router;
