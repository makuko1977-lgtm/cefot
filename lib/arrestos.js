// Arrestos que pasan al capitán de compañía para su curso administrativo.
//
// Una sanción con medida correctora «Arresto» llega al capitán de su
// compañía:
//   - al darla de alta, si la pone el jefe de sección (o el propio capitán
//     actuando dentro de la sección);
//   - si la pone un jefe de pelotón, cuando el jefe de sección la valida
//     (PATCH /api/sanciones/:id/medida) y la medida final es «Arresto».
//
// El estado se guarda en la propia sanción, en `record.capitan`:
//   { estado: "pendiente" | "tramitado", enviadoAt, enviadoPor,
//     tramitadoAt, tramitadoPor }
// Si la medida deja de ser «Arresto» antes de tramitarse, se retira.

function autor(user){
  return {
    dni: user && user.dni,
    nombre: user && user.nombre,
    rol: user && user.capitanCompania ? "capitan" : "jefeSeccion"
  };
}

// Se llama tras crear una sanción o fijar/cambiar su medida desde el jefe
// de sección (o capitán). `user` es quien realiza la acción.
function actualizarEnvio(record, user){
  if (!record) return;
  if (record.medidaCorrectora === "Arresto"){
    if (!record.capitan || record.capitan.estado !== "tramitado"){
      record.capitan = {
        estado: "pendiente",
        enviadoAt: (record.capitan && record.capitan.enviadoAt) || new Date().toISOString(),
        enviadoPor: (record.capitan && record.capitan.enviadoPor) || autor(user)
      };
    }
  } else if (record.capitan && record.capitan.estado === "pendiente"){
    delete record.capitan;
  }
}

// Antecedentes de un alumno dentro de su sección, para avisar al capitán de
// la reincidencia. `excluirId` es la sanción que se está mirando: se cuentan
// las demás. `ordenArresto` indica qué número de arresto es esta (1.º, 2.º…).
function antecedentes(tenant, numero, sancion){
  const num = String(numero);
  const del = (tenant.sanciones || []).filter(function (s){
    return (s.alumnos || []).some(function (a){ return String(a.numero) === num; });
  });
  const otras = del.filter(function (s){ return !sancion || s.id !== sancion.id; });
  const arrestos = otras.filter(function (s){ return s.medidaCorrectora === "Arresto"; });
  function clave(s){ return String(s.fecha || "") + "|" + String(s.createdAt || ""); }
  const previos = sancion
    ? arrestos.filter(function (s){ return clave(s) <= clave(sancion); }).length
    : arrestos.length;
  return {
    sanciones: otras.length,
    arrestos: arrestos.length,
    ordenArresto: sancion && sancion.medidaCorrectora === "Arresto" ? previos + 1 : null
  };
}

module.exports = { actualizarEnvio: actualizarEnvio, antecedentes: antecedentes };
