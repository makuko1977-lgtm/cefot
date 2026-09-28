// v37 · «Se borra desde un único sitio» (servidor).
// - De una sanción se quita a un alumno desde Sanciones: sale también del
//   refuerzo derivado y, si su documento ya se generó, queda pendiente de
//   rehacer (docPendiente).
// - De un refuerzo MANUAL se quita desde Refuerzos; uno derivado de una
//   sanción no se puede tocar desde ahí.
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
const PORT = 3995;
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
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cefot-borrado-"));
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

test("quitar desde Sanciones lo saca también del refuerzo derivado y marca el documento pendiente", async function (){
  const x = await sancionConRefuerzo(["33001", "33002", "33003"]);
  assert.strictEqual((await jefe.pedir("PATCH", "/api/refuerzos/" + x.refuerzo.id + "/rellenado")).status, 200);
  const q = await jefe.pedir("PATCH", "/api/sanciones/" + x.sancion.id + "/quitar-alumno", { numero: "33002" });
  assert.strictEqual(q.status, 200);
  assert.strictEqual(q.json.eliminada, false);
  assert.deepStrictEqual(q.json.sancion.alumnos.map(function (a){ return a.numero; }), ["33001", "33003"]);
  const ref = (await refuerzos()).find(function (r){ return r.id === x.refuerzo.id; });
  assert.deepStrictEqual(ref.alumnos.map(function (a){ return a.numero; }), ["33001", "33003"]);
  assert.strictEqual(ref.docPendiente.quitados.length, 1);
  assert.strictEqual(ref.docPendiente.quitados[0].numero, "33002");
  // Al regenerar el documento el aviso desaparece.
  const g = await jefe.pedir("PATCH", "/api/refuerzos/" + x.refuerzo.id + "/rellenado");
  assert.strictEqual(g.json.refuerzo.docPendiente, undefined);
});

test("sin documento generado no se marca nada; quitar al último borra sanción y refuerzo", async function (){
  const x = await sancionConRefuerzo(["33004"]);
  const q = await jefe.pedir("PATCH", "/api/sanciones/" + x.sancion.id + "/quitar-alumno", { numero: "33004" });
  assert.strictEqual(q.json.eliminada, true);
  assert.strictEqual(q.json.refuerzos[0].eliminado, true);
  assert.ok(!(await sanciones()).some(function (s){ return s.id === x.sancion.id; }));
  assert.ok(!(await refuerzos()).some(function (r){ return r.id === x.refuerzo.id; }));
});

test("un refuerzo derivado no se toca desde Refuerzos; uno manual sí y no afecta a ninguna sanción", async function (){
  const x = await sancionConRefuerzo(["33001", "33005"]);
  const d = await jefe.pedir("PATCH", "/api/refuerzos/" + x.refuerzo.id + "/quitar-alumno", { numero: "33005" });
  assert.strictEqual(d.status, 409);

  const m = await jefe.pedir("POST", "/api/refuerzos", { origen: "manual", expediente: 99, alumnos: alumnosDe(["33001", "33005"]), fechaInicio: "2026-10-05", fechaFin: "2026-10-06", tipo: "Estudio" });
  const antes = JSON.stringify(await sanciones());
  const q = await jefe.pedir("PATCH", "/api/refuerzos/" + m.json.refuerzo.id + "/quitar-alumno", { numero: "33005" });
  assert.strictEqual(q.status, 200);
  assert.deepStrictEqual(q.json.refuerzo.alumnos.map(function (a){ return a.numero; }), ["33001"]);
  assert.strictEqual(JSON.stringify(await sanciones()), antes, "las sanciones no cambian");
});

test("el aviso de documento pendiente se puede descartar («Ya lo he hecho»)", async function (){
  const x = await sancionConRefuerzo(["33002", "33003"]);
  await jefe.pedir("PATCH", "/api/refuerzos/" + x.refuerzo.id + "/rellenado");
  await jefe.pedir("PATCH", "/api/sanciones/" + x.sancion.id + "/quitar-alumno", { numero: "33003" });
  const d = await jefe.pedir("PATCH", "/api/refuerzos/" + x.refuerzo.id + "/descartar-aviso-documento");
  assert.strictEqual(d.status, 200);
  assert.strictEqual(d.json.refuerzo.docPendiente, undefined);
});

test("solo el jefe de sección puede quitar alumnos; y un alumno que no está da 404", async function (){
  const x = await sancionConRefuerzo(["33001", "33002"]);
  assert.strictEqual((await pel.pedir("PATCH", "/api/sanciones/" + x.sancion.id + "/quitar-alumno", { numero: "33001" })).status, 403);
  assert.strictEqual((await jefe.pedir("PATCH", "/api/sanciones/" + x.sancion.id + "/quitar-alumno", { numero: "39999" })).status, 404);
  assert.strictEqual((await jefe.pedir("PATCH", "/api/sanciones/" + x.sancion.id + "/quitar-alumno", {})).status, 400);
});

test("ya no existe el borrado de un expediente entero", async function (){
  const x = await sancionConRefuerzo(["33003"]);
  assert.strictEqual((await jefe.pedir("DELETE", "/api/sanciones/" + x.sancion.id)).status, 404);
  assert.strictEqual((await jefe.pedir("DELETE", "/api/refuerzos/" + x.refuerzo.id)).status, 404);
  assert.ok((await sanciones()).some(function (s){ return s.id === x.sancion.id; }));
});

test("el aviso del parte de pelotón se actualiza al quitar alumnos y desaparece con la sanción", async function (){
  const s = await pel.pedir("POST", "/api/sanciones", { alumnos: ["33004", "33005"], firmas: { "33004": PNG, "33005": PNG }, tipoFalta: "LEVE", fundamento: FUND, fecha: "2026-09-21", motivo: "Parte de prueba", medidaCorrectora: "Refuerzo" });
  assert.strictEqual(s.status, 201);
  const id = s.json.sancion.id;
  const aviso = async function (){ return (await jefe.pedir("GET", "/api/admin/avisos")).json.avisos.find(function (a){ return a.sancionId === id; }); };
  assert.strictEqual((await aviso()).alumnos.length, 2);
  await jefe.pedir("PATCH", "/api/sanciones/" + id + "/quitar-alumno", { numero: "33004" });
  assert.deepStrictEqual((await aviso()).alumnos.map(function (a){ return a.numero; }), ["33005"]);
  await jefe.pedir("PATCH", "/api/sanciones/" + id + "/quitar-alumno", { numero: "33005" });
  assert.strictEqual(await aviso(), undefined);
});
