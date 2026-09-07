function strip(s){
  return String(s == null ? "" : s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = {
  el:1, la:1, los:1, las:1, un:1, una:1, unos:1, unas:1, de:1, del:1, al:1, a:1,
  en:1, y:1, o:1, u:1, que:1, se:1, ha:1, han:1, he:1, has:1, si:1, no:1, por:1,
  con:1, para:1, su:1, sus:1, lo:1, le:1, les:1, me:1, te:1, es:1, son:1, como:1,
  mas:1, muy:1, ya:1, e:1, al:1, ser:1, estar:1, haber:1, tener:1, este:1, esta:1,
  eso:1, esa:1, the:1
};

function tokens(s){
  return strip(s).split(" ").filter(function (w){ return w.length > 2 && !STOP[w]; });
}

function etiquetaCanon(texto){
  const t = strip(texto);
  if (!t) return "(sin motivo)";
  if (/(dormid|adormil|siesta|duerme)/.test(t) && /(clase|aula|formacion|docente|leccion)/.test(t)){
    return "Dormido en clase";
  }
  if (/(dormid|adormil)/.test(t)) return "Dormido en clase";
  if (/(afeit|barba|bigote)/.test(t) || (/(polic)/.test(t) && /(falta|descuid|mal|poco)/.test(t))){
    return "Falta de policía / afeitado";
  }
  if (/(retras|impuntual|lleg.*tarde|tarde a)/.test(t)) return "Retraso";
  if (/(ausenc|no se present|falta a clase|no acudi)/.test(t)) return "Ausencia a clase o actividad";
  if (/(movil|celular|telefono|whatsapp)/.test(t)) return "Uso del teléfono móvil";
  if (/(uniforme|prendas|corrector|boina|botas)/.test(t)) return "Indumentaria / uniforme";
  if (/(respet|desconsider|contesta|replica|descortes)/.test(t)) return "Falta de respeto o desconsideración";
  return texto.replace(/\s+/g, " ").trim() || "(sin motivo)";
}

function jaccard(a, b){
  const sa = {};
  a.forEach(function (w){ sa[w] = 1; });
  let inter = 0;
  b.forEach(function (w){ if (sa[w]) inter++; });
  const union = Object.keys(sa).length + b.length - inter;
  return union ? inter / union : 0;
}

function agruparMotivos(textos){
  const buckets = {};
  textos.forEach(function (raw){
    const etiqueta = etiquetaCanon(raw);
    if (!buckets[etiqueta]) buckets[etiqueta] = { etiqueta: etiqueta, count: 0, variantes: {} };
    buckets[etiqueta].count += 1;
    const v = String(raw || "").replace(/\s+/g, " ").trim() || "(vacío)";
    buckets[etiqueta].variantes[v] = (buckets[etiqueta].variantes[v] || 0) + 1;
  });

  const list = Object.keys(buckets).map(function (k){ return buckets[k]; });
  const usados = {};
  const fused = [];
  for (let i = 0; i < list.length; i++){
    if (usados[i]) continue;
    const acc = list[i];
    const tokA = tokens(acc.etiqueta);
    for (let j = i + 1; j < list.length; j++){
      if (usados[j]) continue;
      const tokB = tokens(list[j].etiqueta);
      if (tokA.length && tokB.length && jaccard(tokA, tokB) >= 0.5){
        usados[j] = true;
        acc.count += list[j].count;
        Object.keys(list[j].variantes).forEach(function (v){
          acc.variantes[v] = (acc.variantes[v] || 0) + list[j].variantes[v];
        });
      }
    }
    fused.push(acc);
  }

  return fused.map(function (b){
    const variantes = Object.keys(b.variantes).map(function (t){
      return { texto: t, count: b.variantes[t] };
    }).sort(function (a, c){ return c.count - a.count; });
    return { etiqueta: b.etiqueta, count: b.count, variantes: variantes };
  }).sort(function (a, b){ return b.count - a.count; });
}

function nAlumnos(rec){
  if (rec && Array.isArray(rec.alumnos) && rec.alumnos.length) return rec.alumnos.length;
  return 1;
}

function recolectar(tenants){
  const sanciones = [];
  const rebajes = [];
  const refuerzos = [];
  tenants.forEach(function (t){
    (t.sanciones || []).forEach(function (s){
      sanciones.push(Object.assign({ _compania: t.compania, _seccion: t.seccion, _tenant: t.id }, s));
    });
    (t.rebajes || []).forEach(function (s){
      rebajes.push(Object.assign({ _compania: t.compania, _seccion: t.seccion, _tenant: t.id }, s));
    });
    (t.refuerzos || []).forEach(function (s){
      refuerzos.push(Object.assign({ _compania: t.compania, _seccion: t.seccion, _tenant: t.id }, s));
    });
  });
  return { sanciones: sanciones, rebajes: rebajes, refuerzos: refuerzos };
}

function resumen(tenants){
  const d = recolectar(tenants);
  const porTipo = { LEVE: 0, GRAVE: 0, OTRO: 0 };
  const porMedida = {};
  const porFundamento = {};
  const motivos = [];
  let arrestosReg = 0;
  let arrestosAlu = 0;
  let sancionesAlu = 0;

  d.sanciones.forEach(function (s){
    const tipo = s.tipoFalta === "GRAVE" ? "GRAVE" : (s.tipoFalta === "LEVE" ? "LEVE" : "OTRO");
    porTipo[tipo] += 1;
    const med = s.medidaCorrectora || "Sin medida";
    porMedida[med] = (porMedida[med] || 0) + 1;
    const fund = (s.fundamento || "(sin fundamento)") + "||" + tipo;
    if (!porFundamento[fund]){
      porFundamento[fund] = { tipo: tipo, fundamento: s.fundamento || "(sin fundamento)", letra: s.fundamentoLetra || "", count: 0 };
    }
    porFundamento[fund].count += 1;
    motivos.push(s.motivo || "");
    const n = nAlumnos(s);
    sancionesAlu += n;
    if (med === "Arresto"){
      arrestosReg += 1;
      arrestosAlu += n;
    }
  });

  const porSeccion = tenants.map(function (t){
    const arrestos = (t.sanciones || []).filter(function (s){ return s.medidaCorrectora === "Arresto"; }).length;
    return {
      id: t.id,
      nombre: t.nombre,
      compania: t.compania,
      seccion: t.seccion,
      refuerzos: (t.refuerzos || []).length,
      rebajes: (t.rebajes || []).length,
      arrestos: arrestos,
      sanciones: (t.sanciones || []).length
    };
  }).sort(function (a, b){
    if (a.compania !== b.compania) return a.compania - b.compania;
    return a.seccion - b.seccion;
  });

  return {
    totales: {
      refuerzos: d.refuerzos.length,
      rebajes: d.rebajes.length,
      arrestos: arrestosReg,
      arrestosAlumnos: arrestosAlu,
      sanciones: d.sanciones.length,
      sancionesAlumnos: sancionesAlu
    },
    sancionesPorTipo: porTipo,
    sancionesPorMedida: porMedida,
    fundamentos: Object.keys(porFundamento).map(function (k){ return porFundamento[k]; })
      .sort(function (a, b){ return b.count - a.count; }),
    motivos: agruparMotivos(motivos),
    porSeccion: porSeccion
  };
}

module.exports = { resumen: resumen, agruparMotivos: agruparMotivos };
