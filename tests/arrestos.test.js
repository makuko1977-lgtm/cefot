// Pruebas del circuito de arrestos hacia el capitán de compañía.
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
const PORT = 3996;
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
function parte(numeros, medida, extra){
  const firmas = {}; numeros.forEach(function (n){ firmas[n] = PNG; });
  return Object.assign({ alumnos: numeros, firmas: firmas, tipoFalta: "LEVE", fundamento: FUND, fecha: "2026-09-20", motivo: "Hecho de prueba", medidaCorrectora: medida }, extra || {});
}
const jefe = new Cliente(), pel = new Cliente(), cap = new Cliente(), cap1 = new Cliente();

before(async function (){
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cefot-arrestos-"));
  const h = bcrypt.hashSync("Clave.2026", 10);
  const roster = ["33001", "33002", "33003"].map(function (n, i){ return { numero: n, ape1: "Ape" + i, ape2: "", nombre: "Nom" + i, peloton: "1" }; });
  const tenant = function (cia, sec, users){ return { compania: cia, seccion: sec, nombre: cia + "ª Compañía · Sección " + sec, users: users, roster: roster, bajas: [], sanciones: [], rebajes: [], refuerzos: [], expedienteCounter: 0, actividades: [], horasUaFechas: {} }; };
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({
    jwtSecret: "prueba-arrestos-abcdefabcdefabcdefabcdefabcdef",
    superAdmins: [{ dni: "SUPERADMIN", nombre: "SA", passwordHash: h }],
    capitanes: [{ dni: "CAP3", nombre: "Capitán 3", compania: 3, passwordHash: h }, { dni: "CAP1", nombre: "Capitán 1", compania: 1, passwordHash: h }],
    jefesEstudios: [],
    tenants: { "3-3": tenant(3, 3, [
      { dni: "JEFE33", nombre: "Jefe 33", role: "admin", passwordHash: h },
      { dni: "PEL1", nombre: "Pelotón 1", role: "instructor", passwordHash: h }]) }
  }));
  await arrancar();
  await jefe.login("JEFE33"); await pel.login("PEL1"); await cap.login("CAP3"); await cap1.login("CAP1");
});
after(async function (){
  await new Promise(function (r){ if (!proc || proc.exitCode !== null) return r(); proc.once("exit", r); proc.kill(); });
  fs.rmSync(dir, { recursive: true, force: true });
});

test("un arresto del jefe de sección llega al capitán al guardarlo; otras medidas no", async function (){
  assert.strictEqual((await jefe.pedir("POST", "/api/sanciones", parte(["33001"], "Arresto", { arrestoFechaIni: "2026-09-22", arrestoFechaFin: "2026-09-23" }))).status, 201);
  assert.strictEqual((await jefe.pedir("POST", "/api/sanciones", parte(["33002"], "Amonestación verbal"))).status, 201);
  const r = await cap.pedir("GET", "/api/capitan/arrestos");
  assert.strictEqual(r.json.pendientes.length, 1);
  assert.strictEqual(r.json.pendientes[0].alumnos[0].numero, "33001");
});

test("el de un jefe de pelotón solo llega cuando el jefe de sección lo valida", async function (){
  const s = await pel.pedir("POST", "/api/sanciones", parte(["33001", "33003"], "Arresto", { arrestoFechaIni: "2026-10-01", arrestoFechaFin: "2026-10-02", fecha: "2026-09-25" }));
  assert.strictEqual(s.status, 201);
  assert.strictEqual((await cap.pedir("GET", "/api/capitan/arrestos")).json.pendientes.length, 1, "aún no validado");
  // «Marcar todos como vistos» no retira el parte con arresto
  const leer = await jefe.pedir("POST", "/api/admin/avisos/leer");
  assert.strictEqual(leer.json.quedanArrestos, 1);
  assert.strictEqual((await jefe.pedir("GET", "/api/admin/avisos")).json.total, 1);
  // Validación con «Guardar medida»
  assert.strictEqual((await jefe.pedir("PATCH", "/api/sanciones/" + s.json.sancion.id + "/medida", { medidaCorrectora: "Arresto", arrestoFechaIni: "2026-10-01", arrestoFechaFin: "2026-10-02" })).status, 200);
  const r = await cap.pedir("GET", "/api/capitan/arrestos");
  assert.strictEqual(r.json.pendientes.length, 2);
  const nuevo = r.json.pendientes.find(function (a){ return a.sancionId === s.json.sancion.id; });
  assert.strictEqual(nuevo.alumnos.length, 2);
  // 33001 ya tenía un arresto: este es el segundo
  assert.strictEqual(nuevo.alumnos.find(function (a){ return a.numero === "33001"; }).antecedentes.ordenArresto, 2);
  assert.strictEqual(nuevo.alumnos.find(function (a){ return a.numero === "33003"; }).antecedentes.ordenArresto, 1);
  assert.strictEqual((await jefe.pedir("GET", "/api/admin/avisos")).json.total, 0);
});

test("si el jefe de sección cambia la medida, se retira al capitán", async function (){
  const s = await pel.pedir("POST", "/api/sanciones", parte(["33002"], "Arresto", { arrestoFechaIni: "2026-10-05", arrestoFechaFin: "2026-10-05" }));
  await jefe.pedir("PATCH", "/api/sanciones/" + s.json.sancion.id + "/medida", { medidaCorrectora: "Arresto" });
  assert.strictEqual((await cap.pedir("GET", "/api/capitan/arrestos")).json.pendientes.length, 3);
  await jefe.pedir("PATCH", "/api/sanciones/" + s.json.sancion.id + "/medida", { medidaCorrectora: "Sin medida" });
  assert.strictEqual((await cap.pedir("GET", "/api/capitan/arrestos")).json.pendientes.length, 2);
});

test("tramitar y devolver a pendientes; solo el capitán de esa compañía", async function (){
  const a = (await cap.pedir("GET", "/api/capitan/arrestos")).json.pendientes[0];
  const ruta = "/api/capitan/arrestos/" + a.tenantId + "/" + a.sancionId;
  assert.strictEqual((await cap1.pedir("POST", ruta + "/tramitar")).status, 403, "capitán de otra compañía");
  assert.strictEqual((await jefe.pedir("POST", ruta + "/tramitar")).status, 403, "jefe de sección");
  assert.strictEqual((await cap1.pedir("GET", "/api/capitan/arrestos")).json.pendientes.length, 0);
  assert.strictEqual((await cap.pedir("POST", ruta + "/tramitar")).status, 200);
  let r = (await cap.pedir("GET", "/api/capitan/arrestos")).json;
  assert.strictEqual(r.pendientes.length, 1); assert.strictEqual(r.tramitados.length, 1);
  // El jefe de sección ve el estado en su listado
  const lista = (await jefe.pedir("GET", "/api/sanciones")).json;
  const sanciones = Array.isArray(lista) ? lista : lista.sanciones;
  assert.strictEqual(sanciones.find(function (x){ return x.id === a.sancionId; }).capitan.estado, "tramitado");
  // Un arresto tramitado no se reabre solo al volver a validar la medida
  assert.strictEqual((await cap.pedir("POST", ruta + "/reabrir")).status, 200);
  r = (await cap.pedir("GET", "/api/capitan/arrestos")).json;
  assert.strictEqual(r.pendientes.length, 2); assert.strictEqual(r.tramitados.length, 0);
});

test("consulta de alumno por nº de protocolo con historial", async function (){
  const r = await cap.pedir("GET", "/api/capitan/alumno/33001");
  assert.strictEqual(r.status, 200);
  const x = r.json.resultados[0];
  assert.strictEqual(x.antecedentes.arrestos, 2);
  assert.strictEqual(x.historial.sanciones.length, 2);
  assert.strictEqual((await cap.pedir("GET", "/api/capitan/alumno/99999")).status, 404);
  assert.strictEqual((await jefe.pedir("GET", "/api/capitan/alumno/33001")).status, 403);
  assert.strictEqual((await cap1.pedir("GET", "/api/capitan/alumno/33001")).status, 404, "otra compañía no lo ve");
});

test("estadísticas: cada sanción cuenta una sola vez aunque la vean tres perfiles", async function (){
  const sa = new Cliente(); await sa.login("SUPERADMIN");
  const est = (await sa.pedir("GET", "/api/estudios/estadisticas")).json;
  const lista = (await jefe.pedir("GET", "/api/sanciones")).json;
  const sanciones = Array.isArray(lista) ? lista : lista.sanciones;
  // 4 partes creados en estas pruebas (2 del jefe de sección, 2 de pelotón)
  assert.strictEqual(sanciones.length, 4);
  assert.strictEqual(est.totales.sanciones, 4);
  // Arrestos que ve el capitán (pendientes + tramitados) = sanciones con arresto enviadas
  const cap3 = (await cap.pedir("GET", "/api/capitan/arrestos")).json;
  const conArresto = sanciones.filter(function (s){ return s.medidaCorrectora === "Arresto"; }).length;
  assert.strictEqual(cap3.pendientes.length + cap3.tramitados.length, conArresto);
  assert.strictEqual(est.totales.arrestos, conArresto);
});
