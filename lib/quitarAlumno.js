// Quitar a UN alumno de un expediente (v37 · «se borra desde un único sitio»).
//
// - De una SANCIÓN se quita desde la pestaña Sanciones. Al hacerlo sale
//   también de los refuerzos derivados de esa sanción, se olvida su marca de
//   «trabajo hecho» y, si el documento (ANEXO) de un refuerzo ya se había
//   generado, se anota en `docPendiente` que hay que rehacerlo.
// - De un REFUERZO MANUAL se quita desde la pestaña Refuerzos (no tiene
//   ninguna sanción detrás). Los refuerzos derivados de una sanción no se
//   tocan desde ahí.
//
// Mismo formato de `docPendiente` que el HTML local (v36/v37), para que la
// copia exportada del servidor se entienda igual al importarla allí:
//   { generadoFecha, quitados: [ { numero, nombre, fecha } ] }

function mismoNumero(al, numero){
  return al && String(al.numero) === String(numero);
}

function nombreCompleto(al){
  return [al.ape1, al.ape2].filter(Boolean).join(" ") + ", " + (al.nombre || "");
}

function marcarDocumentoDesactualizado(refuerzo, alumno){
  if (!refuerzo || !refuerzo.rellenado || !alumno) return;
  if (!refuerzo.docPendiente || !Array.isArray(refuerzo.docPendiente.quitados)){
    refuerzo.docPendiente = { generadoFecha: refuerzo.rellenadoFecha || "", quitados: [] };
  }
  refuerzo.docPendiente.quitados.push({
    numero: String(alumno.numero),
    nombre: nombreCompleto(alumno),
    fecha: new Date().toISOString()
  });
}

// Quita al alumno del registro de refuerzo. Si se queda sin nadie, el
// refuerzo desaparece (y con él el documento, que queda anulado).
// Devuelve { eliminado, refuerzo }.
function quitarDeRefuerzo(datos, refuerzo, numero){
  const alumno = (refuerzo.alumnos || []).filter(function (al){ return mismoNumero(al, numero); })[0];
  refuerzo.alumnos = (refuerzo.alumnos || []).filter(function (al){ return !mismoNumero(al, numero); });
  if (!refuerzo.alumnos.length){
    datos.refuerzos = datos.refuerzos.filter(function (r){ return r.id !== refuerzo.id; });
    return { eliminado: true, refuerzo: refuerzo };
  }
  marcarDocumentoDesactualizado(refuerzo, alumno);
  return { eliminado: false, refuerzo: refuerzo };
}

// Refuerzos nacidos de esa sanción en los que además figura el alumno.
function refuerzosDerivados(datos, sancionId, numero){
  return (datos.refuerzos || []).filter(function (r){
    return r.sancionId && String(r.sancionId) === String(sancionId) &&
      (r.alumnos || []).some(function (al){ return mismoNumero(al, numero); });
  });
}

// Quita al alumno de la sanción (y de sus refuerzos derivados).
// Devuelve { eliminada, sancion, refuerzos: [{ id, eliminado, refuerzo }] }.
function quitarDeSancion(datos, sancion, numero){
  const derivados = refuerzosDerivados(datos, sancion.id, numero);
  if (sancion.trabajoHechoPor && typeof sancion.trabajoHechoPor === "object"){
    delete sancion.trabajoHechoPor[String(numero)];
  }
  sancion.alumnos = (sancion.alumnos || []).filter(function (al){ return !mismoNumero(al, numero); });
  let eliminada = false;
  if (!sancion.alumnos.length){
    datos.sanciones = datos.sanciones.filter(function (r){ return r.id !== sancion.id; });
    eliminada = true;
  }
  // Los avisos de partes de pelotón guardan su propia copia de los alumnos
  // (para poder generar la medida desde el aviso): se actualizan igual, y
  // si la sanción desaparece su aviso ya no tiene nada que revisar.
  if (Array.isArray(datos.avisos)){
    if (eliminada){
      datos.avisos = datos.avisos.filter(function (a){ return String(a.sancionId) !== String(sancion.id); });
    } else {
      datos.avisos.forEach(function (a){
        if (String(a.sancionId) !== String(sancion.id)) return;
        a.alumnos = (a.alumnos || []).filter(function (al){ return !mismoNumero(al, numero); });
      });
    }
  }
  const refuerzos = derivados.map(function (r){
    const res = quitarDeRefuerzo(datos, r, numero);
    return { id: r.id, eliminado: res.eliminado, refuerzo: res.refuerzo };
  });
  return { eliminada: eliminada, sancion: sancion, refuerzos: refuerzos };
}

module.exports = { quitarDeSancion, quitarDeRefuerzo, refuerzosDerivados, marcarDocumentoDesactualizado };
