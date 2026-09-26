// Pruebas del reinicio total para un curso nuevo (panel del Súper Administrador).
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
const PORT = 3998;
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
function parar(){ return new Promise(function (r){ if (!proc || proc.exitCode !== null) return r(); proc.once("exit", r); proc.kill(); }); }

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
  login(dni, password){ return this.pedir("POST", "/api/auth/login", { dni: dni, password: password }); }
}

// Instalación con: un Súper Administrador sin sección (SUPERADMIN) y otro que
// además es jefe de la sección 3-3 (JEFESA), más datos de todo tipo.
before(async function (){
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cefot-reinicio-"));
  const h = function (p){ return bcrypt.hashSync(p, 10); };
  const tenant = function (cia, sec, users){
    return { compania: cia, seccion: sec, nombre: cia + "-" + sec, users: users,
      roster: [{ numero: String(cia) + String(sec) + "001", ape1: "A", nombre: "B", peloton: "1" }], bajas: [],
      sanciones: [{ id: "s-" + cia + sec, expediente: 1, motivo: "x", alumnos: [] }], rebajes: [], refuerzos: [],
      expedienteCounter: 1, actividades: [], horasUaFechas: {} };
  };
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({
    jwtSecret: "prueba-reinicio-abcdefabcdefabcdefabcdefabcdef",
    superAdmins: [{ dni: "SUPERADMIN", nombre: "SA", passwordHash: h("Super.2026") }],
    capitanes: [{ dni: "CAP3", nombre: "Cap", compania: 3, passwordHash: h("Cap.2026") }],
    jefesEstudios: [{ dni: "ESTUDIOS", nombre: "JE", passwordHash: h("Estu.2026") }],
    tenants: {
      "3-3": tenant(3, 3, [
        { dni: "JEFESA", nombre: "Jefe y SA", role: "admin", superAdmin: true, passwordHash: h("JefeSA.2026") },
        { dni: "PELOTON1", nombre: "P1", role: "instructor", passwordHash: h("Pel.2026") }]),
      "3-1": tenant(3, 1, [{ dni: "JEFE31", nombre: "J31", role: "admin", passwordHash: h("Jefe.2026") }])
    }
  }));
  await arrancar();
});
after(async function (){ await parar(); fs.rmSync(dir, { recursive: true, force: true }); });

test("un jefe de sección no puede reiniciar ni descargar la copia completa", async function (){
  const j = new Cliente(); assert.strictEqual((await j.login("JEFE31", "Jefe.2026")).status, 200);
  assert.strictEqual((await j.pedir("POST", "/api/superadmin/reinicio", { confirmacion: "BORRAR TODO", password: "Jefe.2026" })).status, 403);
  assert.strictEqual((await j.pedir("GET", "/api/superadmin/copia-completa")).status, 403);
});

test("sin la frase exacta o con contraseña incorrecta no se borra nada", async function (){
  const sa = new Cliente(); await sa.login("SUPERADMIN", "Super.2026");
  assert.strictEqual((await sa.pedir("POST", "/api/superadmin/reinicio", { confirmacion: "borrar", password: "Super.2026" })).status, 400);
  assert.strictEqual((await sa.pedir("POST", "/api/superadmin/reinicio", { confirmacion: "BORRAR TODO", password: "mala" })).status, 403);
  const r = await sa.pedir("GET", "/api/superadmin/reinicio/resumen");
  assert.strictEqual(r.json.actual.secciones, 2);
  assert.strictEqual(r.json.actual.capitanes, 1);
});

test("la copia completa trae todas las secciones y ninguna contraseña", async function (){
  const sa = new Cliente(); await sa.login("SUPERADMIN", "Super.2026");
  const r = await sa.pedir("GET", "/api/superadmin/copia-completa");
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(Object.keys(r.json.secciones).sort(), ["3-1", "3-3"]);
  assert.strictEqual(r.json.secciones["3-3"].sanciones.length, 1);
  assert.ok(!JSON.stringify(r.json).includes("passwordHash"));
  assert.ok(!JSON.stringify(r.json).includes("jwtSecret"));
});

test("reinicio total: se borra todo menos los Súper Administradores", async function (){
  const jefe = new Cliente(); await jefe.login("JEFE31", "Jefe.2026");
  const jsa = new Cliente(); assert.strictEqual((await jsa.login("JEFESA", "JefeSA.2026")).status, 200);
  const sa = new Cliente(); await sa.login("SUPERADMIN", "Super.2026");

  const r = await sa.pedir("POST", "/api/superadmin/reinicio", { confirmacion: "BORRAR TODO", password: "Super.2026" });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.registro.secciones, 2);

  const res = await sa.pedir("GET", "/api/superadmin/reinicio/resumen");
  assert.deepStrictEqual(
    [res.json.actual.secciones, res.json.actual.usuarios, res.json.actual.alumnos, res.json.actual.sanciones, res.json.actual.capitanes, res.json.actual.jefesEstudios],
    [0, 0, 0, 0, 0, 0]);
  assert.strictEqual(res.json.historial.length, 1);

  // Los demás ya no entran y sus sesiones abiertas dejan de valer.
  for (const [dni, pw] of [["JEFE31", "Jefe.2026"], ["PELOTON1", "Pel.2026"], ["CAP3", "Cap.2026"], ["ESTUDIOS", "Estu.2026"]]){
    assert.strictEqual((await new Cliente().login(dni, pw)).status, 401, dni);
  }
  assert.strictEqual((await jefe.pedir("GET", "/api/sanciones")).status, 401);

  // El Súper Administrador que además era jefe de sección conserva el acceso.
  const otra = await new Cliente().login("JEFESA", "JefeSA.2026");
  assert.strictEqual(otra.status, 200);
  assert.strictEqual(otra.json.superAdmin, true);
  assert.strictEqual(otra.json.tenantId, null);

  // Se puede volver a dar de alta el curso nuevo, incluso con los mismos usuarios.
  assert.strictEqual((await sa.pedir("POST", "/api/superadmin/secciones", { compania: 3, seccion: 1, dni: "JEFE31", nombre: "Nuevo", password: "Nuevo.2026" })).status, 201);
});

test("el reinicio se mantiene tras reiniciar el servidor", async function (){
  await parar(); await arrancar();
  assert.strictEqual((await new Cliente().login("SUPERADMIN", "Super.2026")).status, 200);
  assert.strictEqual((await new Cliente().login("CAP3", "Cap.2026")).status, 401);
  const guardado = JSON.parse(fs.readFileSync(path.join(dir, "data.json"), "utf8"));
  assert.deepStrictEqual(Object.keys(guardado.tenants), ["3-1"]);
  assert.strictEqual(guardado.reiniciosHistorial.length, 1);
});
