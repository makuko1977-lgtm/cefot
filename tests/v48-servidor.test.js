// v48 en el servidor: reposición, «Cargar otra hoja» que fusiona,
// cuestionario QR (solo añade) y programas semanales.
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
const ROSTER = ["33001", "33002", "33003"].map(function (n, i){ return { numero: n, ape1: "Ape" + i, ape2: "", nombre: "Nom" + i, peloton: "1" }; });
async function roster(){ return (await jefe.pedir("GET", "/api/roster")).json; }

before(async function (){
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cefot-v48-"));
  const h = bcrypt.hashSync("Clave.2026", 10);
  const r = JSON.parse(JSON.stringify(ROSTER)); r[0]._foto = "data:image/png;base64,AAAA";
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({
    jwtSecret: "prueba-v48-abcdefabcdefabcdefabcdefabcdefabcd",
    superAdmins: [{ dni: "SUPERADMIN", nombre: "SA", passwordHash: h }],
    capitanes: [], jefesEstudios: [],
    tenants: { "3-3": { compania: 3, seccion: 3, nombre: "3ª Compañía · Sección 3", roster: r, bajas: [], sanciones: [], rebajes: [], refuerzos: [], expedienteCounter: 0, actividades: [], horasUaFechas: {},
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

test("reposición: añade solo números nuevos, con su fecha, y se salta los de la sección y Bajas", async function (){
  await jefe.pedir("PATCH", "/api/roster/33003/baja");
  const r = await jefe.pedir("POST", "/api/roster/reposicion", { fecha: "2026-11-16", archivo: "repo.xlsx", obs: "x",
    filas: [{ numero: "33001", ape1: "Otro" }, { numero: "33003", ape1: "Baja" }, { numero: "33091", ape1: "Nuevo", nombre: "Iván" }] });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json.anadidos.map(function (a){ return a.numero; }), ["33091"]);
  assert.deepStrictEqual(r.json.saltados.sort(), ["33001", "33003"]);
  const d = await roster();
  assert.strictEqual(d.roster.find(function (a){ return a.numero === "33001"; }).ape1, "Ape0", "no se cambia al que ya estaba");
  assert.strictEqual(d.roster.find(function (a){ return a.numero === "33091"; })._reposicion.fecha, "2026-11-16");
  assert.strictEqual((await jefe.pedir("POST", "/api/roster/reposicion", { filas: [{ numero: "33095" }] })).status, 400, "sin fecha no");
  assert.strictEqual((await pel.pedir("POST", "/api/roster/reposicion", { fecha: "2026-11-16", filas: [{ numero: "33096" }] })).status, 403);
});

test("«Cargar otra hoja» fusiona: actualiza, conserva foto/reposición, mantiene ausentes y respeta Bajas", async function (){
  const r = await jefe.pedir("POST", "/api/roster", { fusionar: true, roster: [
    { numero: "33001", ape1: "Cambiado", nombre: "Nom0" }, { numero: "33003", ape1: "DeBaja" }, { numero: "33099", ape1: "Nuevo" }] });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json.resumen, { actualizados: 1, nuevos: 1, mantenidos: 2, mantenidosRepo: 1, siguenBaja: 1, bajas: 1, fotos: 1 });
  const d = await roster();
  const a = d.roster.find(function (x){ return x.numero === "33001"; });
  assert.strictEqual(a.ape1, "Cambiado"); assert.ok(a._foto, "conserva la foto");
  assert.ok(d.roster.find(function (x){ return x.numero === "33002"; }), "el ausente se mantiene");
  assert.ok(d.roster.find(function (x){ return x.numero === "33091"; })._reposicion, "el repuesto conserva su marca");
  assert.ok(!d.roster.find(function (x){ return x.numero === "33003"; }), "el de baja no vuelve a la sección");
  assert.ok(d.bajas.find(function (x){ return x.numero === "33003"; }));
});

test("cuestionario: guarda, nunca sustituye y solo añade preguntas nuevas", async function (){
  let r = await jefe.pedir("PATCH", "/api/roster/cuestionarios", { respuestas: { "33001": { datos: { "Carné": "Sí" }, fecha: "2026-11-18" }, "39999": { datos: { a: "b" } } } });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.json.guardados, ["33001"]); assert.deepStrictEqual(r.json.noEncontrados, ["39999"]);
  r = await jefe.pedir("PATCH", "/api/roster/cuestionarios", { respuestas: { "33001": { datos: { "Carné": "No", "Talla": "M" } } } });
  const a = (await roster()).roster.find(function (x){ return x.numero === "33001"; });
  assert.deepStrictEqual(a._cuestionario, { "Carné": "Sí", "Talla": "M" });
  assert.strictEqual(a._cuestionarioFecha, "2026-11-18");
  // un guardado normal del listado no lo borra
  await jefe.pedir("POST", "/api/roster", { roster: (await roster()).roster.map(function (x){ return { numero: x.numero, ape1: x.ape1 }; }) });
  assert.ok((await roster()).roster.find(function (x){ return x.numero === "33001"; })._cuestionario);
});

test("programas semanales: se guardan en el servidor, se validan y salen en la copia", async function (){
  const p = { id: "p1", ini: "2026-11-16", fin: "2026-11-20", archivo: "s47.xlsx", celdas: [], cambios: {} };
  assert.strictEqual((await jefe.pedir("PUT", "/api/programas", { programas: [p] })).status, 200);
  assert.deepStrictEqual((await jefe.pedir("GET", "/api/programas")).json.programas, [p]);
  assert.strictEqual((await jefe.pedir("PUT", "/api/programas", { programas: [{ id: "x", ini: "mal" }] })).status, 400);
  assert.strictEqual((await jefe.pedir("PUT", "/api/programas", { programas: [p, p] })).status, 400);
  assert.strictEqual((await pel.pedir("GET", "/api/programas")).status, 403);
  const copia = await jefe.pedir("GET", "/api/admin/backup");
  assert.strictEqual(copia.status, 200);
  assert.strictEqual(copia.json.programasSemanales.length, 1);
});
