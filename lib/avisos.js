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
    alumnos: (record.alumnos || []).map(function (a){
      return { numero: a.numero, nombre: a.nombre, ape1: a.ape1, ape2: a.ape2 };
    }),
    createdAt: record.createdAt,
    createdBy: autor || record.createdBy || {},
    leido: false
  });
  tenant.avisos = tenant.avisos.slice(0, 50);
}

module.exports = { registrarParte: registrarParte };
