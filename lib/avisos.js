const crypto = require("crypto");

function registrarParte(tenant, record, autor){
  if (!tenant || !record) return;
  if (autor && autor.role === "admin") return;
  tenant.avisos = tenant.avisos || [];
  tenant.avisos.unshift({
    id: crypto.randomUUID(),
    tipo: "sancion",
    sancionId: record.id,
    expediente: record.expediente,
    medida: record.medidaCorrectora || "",
    tipoFalta: record.tipoFalta || "",
    motivo: record.motivo || "",
    // Resto de datos de la sanción original, guardados aquí para poder
    // generar el refuerzo (u otra medida) directamente desde el aviso sin
    // depender de que el jefe de sección tenga ya sincronizada la sección
    // en este dispositivo (las sanciones normales viven en su almacén
    // local del navegador; este aviso vive en el servidor).
    fecha: record.fecha || "",
    lugar: record.lugar || "",
    hora: record.hora || "",
    profEmpleo: record.profEmpleo || "",
    profNombre: record.profNombre || "",
    profApellidos: record.profApellidos || "",
    profDni: record.profDni || "",
    fundamento: record.fundamento || "",
    fundamentoLetra: record.fundamentoLetra || "",
    observaciones: record.observaciones || "",
    arrestoFechaIni: record.arrestoFechaIni || "",
    arrestoFechaFin: record.arrestoFechaFin || "",
    trabajoFechaFin: record.trabajoFechaFin || "",
    alumnos: (record.alumnos || []).map(function (a){
      return { numero: a.numero, nombre: a.nombre, ape1: a.ape1, ape2: a.ape2, peloton: a.peloton };
    }),
    createdAt: record.createdAt,
    createdBy: autor || record.createdBy || {},
    leido: false
  });
  tenant.avisos = tenant.avisos.slice(0, 50);
}

module.exports = { registrarParte: registrarParte };
