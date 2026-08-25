const express = require("express");
const auth = require("../lib/auth");

const router = express.Router();

function rangosSolapan(aIni, aFin, bIni, bFin){
  if (!aIni || !aFin || !bIni || !bFin) return false;
  return aIni <= bFin && aFin >= bIni;
}

function sortByApellido(list){
  return list.slice().sort(function (a, b){
    return (String(a.ape1 || "") + String(a.ape2 || "")).localeCompare(String(b.ape1 || "") + String(b.ape2 || ""), "es");
  });
}

router.get("/estado-periodo", auth.requireAuth, auth.requireRole("admin"), function (req, res){
  const fechaIni = req.query.ini;
  const fechaFin = req.query.fin;
  if (!fechaIni || !fechaFin){
    return res.status(400).json({ error: "Faltan fechas." });
  }

  const rebajados = sortByApellido(
    req.db.rebajes
      .filter(function (r){ return rangosSolapan(r.fechaInicio, r.fechaFin, fechaIni, fechaFin); })
      .map(function (r){
        return {
          numero: r.numero, ape1: r.ape1, ape2: r.ape2, nombre: r.nombre, peloton: r.peloton,
          desde: r.fechaInicio, hasta: r.fechaFin,
          detalle: [r.total ? "Total/clase" : "", Object.keys(r.categorias || {}).filter(function (k){ return r.categorias[k]; }).join(", ")].filter(Boolean).join(" · ") || "—"
        };
      })
  );

  const refuerzo = [];
  req.db.refuerzos.forEach(function (r){
    if (!rangosSolapan(r.fechaInicio, r.fechaFin, fechaIni, fechaFin)) return;
    (r.alumnos || []).forEach(function (al){
      refuerzo.push({
        numero: al.numero, ape1: al.ape1, ape2: al.ape2, nombre: al.nombre, peloton: al.peloton,
        desde: r.fechaInicio, hasta: r.fechaFin,
        detalle: [r.tipo, r.horaInicio, r.duracion ? (r.duracion + " h/día") : ""].filter(Boolean).join(" · ") || "—"
      });
    });
  });

  const sancionados = [];
  req.db.sanciones.forEach(function (r){
    if (r.medidaCorrectora !== "Arresto") return;
    if (!rangosSolapan(r.arrestoFechaIni, r.arrestoFechaFin, fechaIni, fechaFin)) return;
    (r.alumnos || []).forEach(function (al){
      sancionados.push({
        numero: al.numero, ape1: al.ape1, ape2: al.ape2, nombre: al.nombre, peloton: al.peloton,
        desde: r.arrestoFechaIni, hasta: r.arrestoFechaFin,
        detalle: "Exp. Nº " + r.expediente + (r.arrestoDias ? " · " + r.arrestoDias + (r.arrestoDias === 1 ? " día" : " días") : "")
      });
    });
  });

  res.json({
    rebajados: rebajados,
    refuerzo: sortByApellido(refuerzo),
    sancionados: sortByApellido(sancionados)
  });
});

module.exports = router;
