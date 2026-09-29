// v37 · Hoja de seguimiento en el servidor: se guarda por alumno, solo con
// sus sanciones; se limpia al quitarle de una sanción y al cerrar el curso;
// va en la copia exportada para el HTML local.
// Uso: npm test     (no toca data/: usa una carpeta temporal)
"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const RAIZ = path.join(__dirname, "..");
const PORT = 3994;
const B = "http://127.0.0.1:" + PORT;
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const FUND = require("../public/shared/catalog.js").FALTA_CATALOG.LEVE[0];
let dir, proc;

function arrancar(){
  return new Promise(function (resolve, reject){
    proc = spawn(process.execPath, ["server.js"], { cwd: RAIZ, env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: dir, DATABASE_URL: "" }) });
    let out = "";
    proc.stdout.on("data", function (d){ out += d; if (out.includes("escuchando")) resolve(); });
    proc.stderr.on("data", function (d){ out += d; });
    proc.on("exit", function (c){ if (c) reject(new Error("El servidor terminó: " + out)); });
  });
}
class Cliente {
  constructor(){ this.cookie = ""; }
  async pedir(metodo, ruta, cuerpo){
    const h = { "Content-Type": "application/json" };
    if (this.cookie) h.Cookie = this.cookie;
    const r = await fetch(B + ruta, { method: metodo, headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    const sc = r.headers.get("set-cookie"); if (sc) this.cookie = sc.split(";")[0];
    let json = null; try { json = await r.json(); } catch (e){}
    return { status: r.status, json: json };
  }
  async login(dni){ return (await this.pedir("POST", "/api/auth/login", { dni: dni, password: "Clave.2026" })).status; }
}
const jefe = new Cliente(), pel = new Cliente();
const ROSTER = ["33001", "33002", "33003", "33004", "33005"].map(function (n, i){ return { numero: n, ape1: "Ape" + i, ape2: "", nombre: "Nom" + i, peloton: "1" }; });
function alumnosDe(numeros){ return ROSTER.filter(function (a){ return numeros.indexOf(a.numero) !== -1; }); }

async function sancionConRefuerzo(numeros){
  const firmas = {}; numeros.forEach(function (n){ firmas[n] = PNG; });
  const s = await jefe.pedir("POST", "/api/sanciones", { alumnos: numeros, firmas: firmas, tipoFalta: "LEVE", fundamento: FUND, fecha: "2026-09-20", motivo: "Hecho de prueba", medidaCorrectora: "Refuerzo" });
  assert.strictEqual(s.status, 201);
  const sancion = s.json.sancion;
  const r = await jefe.pedir("POST", "/api/refuerzos", { origen: "sancion", expediente: sancion.expediente, sancionId: sancion.id, alumnos: alumnosDe(numeros), fechaInicio: "2026-10-01", fechaFin: "2026-10-02", tipo: "Estudio" });
  assert.strictEqual(r.status, 201);
  return { sancion: sancion, refuerzo: r.json.refuerzo };
}
async function refuerzos(){ return (await jefe.pedir("GET", "/api/refuerzos")).json.refuerzos; }
async function sanciones(){ return (await jefe.pedir("GET", "/api/sanciones")).json.sanciones; }

before(async function (){
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cefot-seg-"));
  const h = bcrypt.hashSync("Clave.2026", 10);
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({
    jwtSecret: "prueba-borrado-abcdefabcdefabcdefabcdefabcdef",
    superAdmins: [{ dni: "SUPERADMIN", nombre: "SA", passwordHash: h }],
    capitanes: [], jefesEstudios: [],
    tenants: { "3-3": { compania: 3, seccion: 3, nombre: "3ª Compañía · Sección 3", roster: ROSTER, bajas: [], sanciones: [], rebajes: [], refuerzos: [], expedienteCounter: 0, actividades: [], horasUaFechas: {},
      users: [{ dni: "JEFE33", nombre: "Jefe 33", role: "admin", passwordHash: h },
              { dni: "PEL1", nombre: "Pelotón 1", role: "instructor", passwordHash: h }] } }
  }));
  await arrancar();
  await jefe.login("JEFE33"); await pel.login("PEL1");
});
after(async function (){
  await new Promise(function (r){ if (!proc || proc.exitCode !== null) return r(); proc.once("exit", r); proc.kill(); });
  fs.rmSync(dir, { recursive: true, force: true });
});


test("guarda la hoja del alumno solo con líneas de sus propias sanciones", async function (){
  const a = await sancionConRefuerzo(["33001", "33002"]);
  const b = await sancionConRefuerzo(["33003"]);
  const lineas = {}; lineas[a.sancion.id] = { incluida: false, observaciones: "Texto propio" }; lineas[b.sancion.id] = { incluida: true, observaciones: "ajena" };
  const r = await jefe.pedir("PUT", "/api/seguimientos/33001", { lineas: lineas });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(Object.keys(r.json.seguimiento.lineas), [a.sancion.id], "la sanción de otro alumno no se guarda");
  const g = await jefe.pedir("GET", "/api/seguimientos");
  assert.strictEqual(g.json.seguimientos["33001"].lineas[a.sancion.id].observaciones, "Texto propio");
  assert.strictEqual(g.json.seguimientos["33001"].lineas[a.sancion.id].incluida, false);
});

test("quitar al alumno de la sanción borra su línea de la hoja", async function (){
  const a = await sancionConRefuerzo(["33004", "33005"]);
  const lineas = {}; lineas[a.sancion.id] = { incluida: true, observaciones: "x" };
  await jefe.pedir("PUT", "/api/seguimientos/33004", { lineas: lineas });
  await jefe.pedir("PATCH", "/api/sanciones/" + a.sancion.id + "/quitar-alumno", { numero: "33004" });
  const g = await jefe.pedir("GET", "/api/seguimientos");
  assert.strictEqual(g.json.seguimientos["33004"].lineas[a.sancion.id], undefined);
});

test("el ciclo se guarda y va en la copia exportada con las hojas", async function (){
  assert.strictEqual((await jefe.pedir("PUT", "/api/seguimientos/ciclo", { ciclo: "1º/26" })).status, 200);
  assert.strictEqual((await jefe.pedir("PUT", "/api/seguimientos/ciclo", { ciclo: "x".repeat(41) })).status, 400);
  const c = await jefe.pedir("GET", "/api/admin/backup");
  assert.strictEqual(c.json.seguimientoCiclo, "1º/26");
  assert.ok(c.json.seguimientos["33001"]);
});

test("permisos y validación", async function (){
  assert.strictEqual((await pel.pedir("GET", "/api/seguimientos")).status, 403);
  assert.strictEqual((await pel.pedir("PUT", "/api/seguimientos/33001", { lineas: {} })).status, 403);
  assert.strictEqual((await jefe.pedir("PUT", "/api/seguimientos/39999", { lineas: {} })).status, 404);
  assert.strictEqual((await jefe.pedir("PUT", "/api/seguimientos/33001", {})).status, 400);
});

test("cerrar el curso vacía las hojas y el ciclo", async function (){
  const r = await jefe.pedir("POST", "/api/admin/cerrar-curso", { confirmacion: "CERRAR CURSO" });
  assert.strictEqual(r.status, 200);
  const g = await jefe.pedir("GET", "/api/seguimientos");
  assert.deepStrictEqual(g.json.seguimientos, {});
  assert.strictEqual(g.json.ciclo, "");
});
