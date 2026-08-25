// Crea o repara, desde la línea de comandos, una cuenta de Súper
// Administrador SIN sección propia — pensado como acceso de emergencia
// (por ejemplo si se ha perdido la contraseña del único Súper Administrador
// y no se puede entrar por la web para arreglarlo desde ningún sitio).
//   node lib/seed.js <DNI> "<Nombre Apellidos>" <contraseña>
// Si el DNI ya existe en el sistema (como Súper Administrador o como
// usuario de cualquier sección), esta herramienta:
//   - si ya es Súper Administrador sin sección propia: le cambia la
//     contraseña y el nombre.
//   - si es un usuario de una sección (jefe de sección o de pelotón): le
//     añade el permiso `superAdmin: true` (sin tocar su contraseña ni su
//     sección — para eso, cambia la contraseña desde la propia aplicación).
//   - si no existe: lo crea como Súper Administrador nuevo, sin sección.
// Si hay DATABASE_URL definida, se conecta a esa base de datos (útil para
// arreglar el acceso de un despliegue remoto sin tener que entrar por SSH).
const db = require("./db");
const auth = require("./auth");

const [, , dniArg, nombreArg, passwordArg] = process.argv;

if (!dniArg || !nombreArg || !passwordArg){
  console.error("Uso: node lib/seed.js <DNI> \"<Nombre Apellidos>\" <contraseña>");
  process.exit(1);
}

async function main(){
  await db.init();

  const dni = auth.normalizeDni(dniArg);
  const found = db.findUserGlobal(dni);

  if (found && found.tenantId){
    // Ya es usuario de una sección: solo se le concede el permiso extra,
    // sin tocar su contraseña ni su rol en esa sección.
    found.user.superAdmin = true;
    await db.save();
    console.log("El usuario " + dni + " (sección " + found.tenantId + ") ahora también es Súper Administrador.");
    console.log("Su contraseña de siempre sigue siendo válida para todo.");
  } else if (found){
    // Ya era Súper Administrador sin sección propia: se repara.
    found.user.nombre = nombreArg;
    found.user.passwordHash = auth.hashPassword(passwordArg);
    await db.save();
    console.log("Súper Administrador actualizado: " + dni);
  } else {
    db.data.superAdmins.push({
      dni: dni,
      nombre: nombreArg,
      passwordHash: auth.hashPassword(passwordArg),
      createdAt: new Date().toISOString()
    });
    await db.save();
    console.log("Súper Administrador creado: " + dni);
  }

  process.exit(0);
}

main().catch(function (err){
  console.error("Error:", err);
  process.exit(1);
});
