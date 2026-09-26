// Servidor de DEMOSTRACIÓN con datos 100 % ficticios.
//
//   npm run demo            -> arranca (y siembra la primera vez) en el puerto 3000
//   npm run demo -- --reset -> borra los datos de demo y los vuelve a generar
//
// Guarda todo en data-demo/ (nunca toca data/ ni una DATABASE_URL real, que
// se ignora a propósito). Arranca server.js como proceso hijo y, si la
// carpeta está vacía, rellena la instalación a través de la propia API
// (secciones, usuarios, roster, partes, rebajes), igual que lo haría un
// usuario desde la web — así los datos tienen exactamente el formato real.
//
// Ninguna persona, DNI ni teléfono de estos datos es real.

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data-demo");
const PORT = process.env.PORT || 3000;
const BASE = "http://127.0.0.1:" + PORT;
const PASSWORD = "demo1234";

// Cuentas de demostración (usuario / contraseña común PASSWORD).
const CUENTAS = [
  { dni: "SUPERADMIN", rol: "Súper Administrador", pantalla: "/superadmin.html" },
  { dni: "JEFE33",     rol: "Jefe de sección 3ª Cía · Secc. 3", pantalla: "/admin.html" },
  { dni: "PELOTON1",   rol: "Jefe de pelotón (con todos los permisos)", pantalla: "/instructor.html" },
  { dni: "PELOTON2",   rol: "Jefe de pelotón (solo partes)", pantalla: "/instructor.html" },
  { dni: "JEFE31",     rol: "Jefe de sección 3ª Cía · Secc. 1", pantalla: "/admin.html" },
  { dni: "CAPITAN3",   rol: "Capitán 3ª Compañía", pantalla: "/capitan.html" },
  { dni: "ESTUDIOS",   rol: "Jefe de estudios", pantalla: "/estudios.html" }
];

const NOMBRES = ["Adrián", "Lucía", "Marcos", "Elena", "Javier", "Sara", "Hugo", "Nerea", "Iván", "Paula",
  "Rubén", "Irene", "Óscar", "Alba", "Diego", "Clara", "Sergio", "Marta", "Pablo", "Noelia"];
const APELLIDOS = ["Ficticio", "Ejemplo", "Pruebas", "Demo", "Simulado", "Modelo", "Muestra", "Inventado",
  "Supuesto", "Imaginario", "Figurado", "Ensayo"];
const MUJERES = ["Lucía", "Elena", "Sara", "Nerea", "Paula", "Irene", "Alba", "Clara", "Marta", "Noelia"];

// PNG de 1×1 píxel: sirve como "firma" del alumno (la API exige una).
const FIRMA_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function hoyMas(dias){
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function crearRoster(){
  const roster = [];
  for (let i = 0; i < 24; i++){
    const nombre = NOMBRES[i % NOMBRES.length];
    roster.push({
      numero: String(33001 + i),   // 1er dígito = compañía, 2º = sección
      ape1: APELLIDOS[i % APELLIDOS.length],
      ape2: APELLIDOS[(i * 5 + 3) % APELLIDOS.length],
      nombre: nombre,
      peloton: String((i % 4) + 1),
      sexo: MUJERES.indexOf(nombre) !== -1 ? "M" : "H",
      unidad: "BAL/3ª CÍA",
      dni: "00000" + String(100 + i) + "X",   // formato inválido a propósito: no es un DNI real
      telefono: "600000" + String(100 + i)
    });
  }
  return roster;
}

// ---------------- cliente HTTP mínimo con cookie de sesión ----------------
function cliente(){
  let cookie = "";
  async function req(method, url, body){
    const res = await fetch(BASE + url, {
      method: method,
      headers: Object.assign({ "Content-Type": "application/json" }, cookie ? { Cookie: cookie } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const json = await res.json().catch(function (){ return {}; });
    if (!res.ok) throw new Error(method + " " + url + " -> " + res.status + " " + (json.error || ""));
    return json;
  }
  return {
    login: function (dni){ return req("POST", "/api/auth/login", { dni: dni, password: PASSWORD }); },
    post: function (url, body){ return req("POST", url, body); },
    get: function (url){ return req("GET", url); }
  };
}

async function esperarServidor(){
  for (let i = 0; i < 50; i++){
    try {
      await fetch(BASE + "/login.html");
      return;
    } catch (err){
      await new Promise(function (r){ setTimeout(r, 200); });
    }
  }
  throw new Error("El servidor no respondió en el puerto " + PORT);
}

// ---------------- siembra de datos ficticios ----------------
async function sembrar(){
  const catalog = require("../public/shared/catalog.js");

  const sa = cliente();
  await sa.login("SUPERADMIN");
  await sa.post("/api/superadmin/secciones", { compania: 3, seccion: 3, dni: "JEFE33", nombre: "Sargento Demo Ejemplo", password: PASSWORD });
  await sa.post("/api/superadmin/secciones", { compania: 3, seccion: 1, dni: "JEFE31", nombre: "Sargento Prueba Modelo", password: PASSWORD });
  await sa.post("/api/superadmin/capitanes", { compania: 3, dni: "CAPITAN3", nombre: "Capitán Ficticio Supuesto", password: PASSWORD });
  await sa.post("/api/superadmin/jefes-estudios", { dni: "ESTUDIOS", nombre: "Comandante Muestra Ensayo", password: PASSWORD });

  const jefe = cliente();
  await jefe.login("JEFE33");
  await jefe.post("/api/admin/usuarios", {
    dni: "PELOTON1", nombre: "Cabo Primero Demo Uno", password: PASSWORD, role: "instructor",
    permisos: { fotos: true, verFicha: true, adjuntos: true, verRebajesRefuerzos: true }
  });
  await jefe.post("/api/admin/usuarios", { dni: "PELOTON2", nombre: "Cabo Demo Dos", password: PASSWORD, role: "instructor", permisos: {} });

  const roster = crearRoster();
  await jefe.post("/api/roster", { roster: roster });

  const L = catalog.FALTA_CATALOG.LEVE;
  const G = catalog.FALTA_CATALOG.GRAVE;
  function parte(alumnos, tipo, fundamento, motivo, medida, extra){
    const firmas = {};
    alumnos.forEach(function (n){ firmas[n] = FIRMA_PNG; });
    return Object.assign({
      alumnos: alumnos, firmas: firmas, tipoFalta: tipo, fundamento: fundamento,
      fecha: hoyMas(-Math.floor(Math.random() * 20) - 1), hora: "08:30", lugar: "Aula 3 (ficticia)",
      fase: "FFMG", motivo: motivo, medidaCorrectora: medida,
      profEmpleo: "Sargento", profNombre: "Demo", profApellidos: "Ejemplo Pruebas", profDni: "DEMO"
    }, extra || {});
  }

  await jefe.post("/api/sanciones", parte(["33001"], "LEVE", L[0], "Llega 10 minutos tarde a la formación (hecho ficticio).", "Amonestación verbal"));
  await jefe.post("/api/sanciones", parte(["33005", "33009"], "LEVE", L[2], "Hablan durante la clase teórica (hecho ficticio).", "Refuerzo"));
  await jefe.post("/api/sanciones", parte(["33012"], "LEVE", L[1], "No presenta el trabajo encargado (hecho ficticio).",
    "Trabajo no superior a 5 horas", { trabajoFechaFin: hoyMas(5) }));
  // El alumno 33018 acumula dos arrestos anteriores (ya tramitados por el
  // capitán), para que el siguiente sea su tercero y se vea la reincidencia.
  await jefe.post("/api/sanciones", parte(["33018"], "LEVE", L[1], "No sigue las normas de seguridad en la galería de tiro (hecho ficticio).",
    "Arresto", { fecha: hoyMas(-25), arrestoFechaIni: hoyMas(-22), arrestoFechaFin: hoyMas(-21) }));
  await jefe.post("/api/sanciones", parte(["33018"], "GRAVE", G[0], "Hecho grave de prueba para la demostración.",
    "Arresto", { fecha: hoyMas(-12), arrestoFechaIni: hoyMas(-10), arrestoFechaFin: hoyMas(-8) }));

  // Partes dados de alta por jefes de pelotón: generan avisos al jefe de sección.
  const p1 = cliente();
  await p1.login("PELOTON1");
  await p1.post("/api/sanciones", parte(["33002"], "LEVE", L[0], "Retraso a la instrucción (parte de pelotón, ficticio).", "Amonestación verbal"));
  const p2 = cliente();
  await p2.login("PELOTON2");
  await p2.post("/api/sanciones", parte(["33007"], "LEVE", L[2], "Uso del móvil en clase (parte de pelotón, ficticio).", "Sin medida"));

  // El capitán ya ha dado curso a los arrestos anteriores.
  const cap = cliente();
  await cap.login("CAPITAN3");
  const arr = await cap.get("/api/capitan/arrestos");
  for (const a of arr.pendientes){
    await cap.post("/api/capitan/arrestos/" + a.tenantId + "/" + a.sancionId + "/tramitar");
  }

  const r = roster[3];
  await jefe.post("/api/rebajes", {
    numero: r.numero, ape1: r.ape1, ape2: r.ape2, nombre: r.nombre, peloton: r.peloton,
    fechaInicio: hoyMas(-2), fechaFin: hoyMas(5), total: true, categorias: {}
  });
}

async function main(){
  if (process.argv.indexOf("--reset") !== -1 && fs.existsSync(DATA_DIR)){
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    console.log("Datos de demostración borrados.");
  }
  const nueva = !fs.existsSync(path.join(DATA_DIR, "data.json"));

  if (nueva){
    // Súper Administrador con contraseña conocida, creado antes de arrancar
    // para que server.js no genere uno con contraseña aleatoria.
    const env = Object.assign({}, process.env, { DATA_DIR: DATA_DIR });
    delete env.DATABASE_URL;
    await new Promise(function (resolve, reject){
      const seed = spawn(process.execPath, [path.join(__dirname, "seed.js"), "SUPERADMIN", "Súper Administrador (demo)", PASSWORD],
        { env: env, stdio: "inherit" });
      seed.on("exit", function (code){ code === 0 ? resolve() : reject(new Error("seed.js terminó con código " + code)); });
    });
  }

  const env = Object.assign({}, process.env, { DATA_DIR: DATA_DIR, PORT: String(PORT) });
  delete env.DATABASE_URL;           // nunca escribir en una base de datos real
  env.NODE_ENV = "development";      // cookie sin "secure": funciona en http://localhost
  const server = spawn(process.execPath, [path.join(ROOT, "server.js")], { env: env, stdio: "inherit" });
  server.on("exit", function (code){ process.exit(code || 0); });
  ["SIGINT", "SIGTERM"].forEach(function (sig){ process.on(sig, function (){ server.kill(sig); }); });

  await esperarServidor();
  if (nueva){
    console.log("Sembrando datos ficticios...");
    await sembrar();
  }

  console.log("");
  console.log("==================== SERVIDOR DE DEMOSTRACIÓN ====================");
  console.log(" Datos 100 % ficticios en data-demo/  (reiniciar: npm run demo -- --reset)");
  console.log(" Entrada: " + BASE.replace("127.0.0.1", "localhost") + "/login.html");
  console.log(" Contraseña de todas las cuentas: " + PASSWORD);
  CUENTAS.forEach(function (c){
    console.log("  - " + (c.dni + "            ").slice(0, 12) + c.rol);
  });
  console.log("==================================================================");
}

main().catch(function (err){
  console.error("Error en el servidor de demostración:", err.message);
  process.exit(1);
});
