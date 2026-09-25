// Pruebas de regresión de seguridad y persistencia.
// Uso: node --test tests/     (no toca data/: usa una carpeta temporal)
"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const RAIZ = path.join(__dirname, "..");
const PORT = 3999;
const B = "http://127.0.0.1:" + PORT;
let dir, proc, saPass;

function arrancar(){
  return new Promise(function (resolve, reject){
    proc = spawn(process.execPath, ["server.js"], { cwd: RAIZ, env: Object.assign({}, process.env, { PORT: String(PORT), DATA_DIR: dir, DATABASE_URL: "" }) });
    let out = "";
    proc.stdout.on("data", function (d){
      out += d;
      const m = out.match(/Contraseña: (\S+)/); if (m) saPass = m[1];
      if (out.includes("escuchando")) resolve();
    });
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

before(async function (){
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cefot-test-"));
  await arrancar();
});
after(async function (){ await parar(); fs.rmSync(dir, { recursive: true, force: true }); });

test("instalación nueva: el súper administrador inicial funciona", async function (){
  const sa = new Cliente();
  const r = await sa.login("SUPERADMIN", saPass);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.superAdmin, true);
  assert.strictEqual((await sa.pedir("GET", "/api/superadmin/secciones")).status, 200);
});

test("nadie puede crear usuarios con identificadores reservados", async function (){
  const sa = new Cliente(); await sa.login("SUPERADMIN", saPass);
  assert.strictEqual((await sa.pedir("POST", "/api/superadmin/secciones", { compania: 1, seccion: 1, dni: "JEFE11", nombre: "Jefe 1-1", password: "Jefe.2026" })).status, 201);
  const jefe = new Cliente(); assert.strictEqual((await jefe.login("JEFE11", "Jefe.2026")).status, 200);
  for (const dni of ["superadmin", "SUPERADMIN", "admin"]){
    const r = await jefe.pedir("POST", "/api/admin/usuarios", { dni: dni, nombre: "X", password: "123456" });
    assert.strictEqual(r.status, 400, "debería rechazar " + dni);
  }
  assert.strictEqual((await sa.pedir("POST", "/api/superadmin/capitanes", { compania: 2, dni: "superadmin", nombre: "X", password: "123456" })).status, 400);
  assert.strictEqual((await sa.pedir("POST", "/api/superadmin/jefes-estudios", { dni: "SUPERADMIN", nombre: "X", password: "123456" })).status, 400);
});

test("un usuario eliminado pierde el acceso inmediatamente", async function (){
  const jefe = new Cliente(); await jefe.login("JEFE11", "Jefe.2026");
  assert.strictEqual((await jefe.pedir("POST", "/api/admin/usuarios", { dni: "INSTR11", nombre: "Instr", password: "Inst.2026" })).status, 201);
  const ins = new Cliente(); assert.strictEqual((await ins.login("INSTR11", "Inst.2026")).status, 200);
  assert.strictEqual((await ins.pedir("GET", "/api/roster/buscar?q=")).status, 200);
  assert.strictEqual((await jefe.pedir("DELETE", "/api/admin/usuarios/INSTR11")).status, 200);
  assert.strictEqual((await ins.pedir("GET", "/api/roster/buscar?q=")).status, 401);
  assert.strictEqual((await ins.pedir("GET", "/api/auth/me")).status, 401);
});

test("capitán: entra solo en su compañía y pierde el acceso si se le retira", async function (){
  const sa = new Cliente(); await sa.login("SUPERADMIN", saPass);
  assert.strictEqual((await sa.pedir("POST", "/api/superadmin/capitanes", { compania: 1, dni: "CAP1", nombre: "Capitán 1", password: "Cap1.2026" })).status, 201);
  const cap = new Cliente(); assert.strictEqual((await cap.login("CAP1", "Cap1.2026")).status, 200);
  assert.strictEqual((await cap.pedir("POST", "/api/capitan/secciones/2-1/entrar")).status, 403);
  assert.strictEqual((await cap.pedir("POST", "/api/capitan/secciones/1-1/entrar")).status, 200);
  assert.strictEqual((await cap.pedir("GET", "/api/sanciones")).status, 200);
  assert.strictEqual((await sa.pedir("DELETE", "/api/superadmin/capitanes/1")).status, 200);
  assert.strictEqual((await cap.pedir("GET", "/api/sanciones")).status, 401);
});

test("los jefes de estudios se conservan tras reiniciar el servidor", async function (){
  const sa = new Cliente(); await sa.login("SUPERADMIN", saPass);
  assert.strictEqual((await sa.pedir("POST", "/api/superadmin/jefes-estudios", { dni: "ESTUDIOS1", nombre: "JE", password: "Estu.2026" })).status, 201);
  await parar(); await arrancar();
  const je = new Cliente();
  const r = await je.login("ESTUDIOS1", "Estu.2026");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.jefeEstudios, true);
  const guardado = JSON.parse(fs.readFileSync(path.join(dir, "data.json"), "utf8"));
  assert.ok(guardado.jefesEstudios.some(function (j){ return j.dni === "ESTUDIOS1"; }));
});

test("instalación migrada: un jefe de sección no puede hacerse súper administrador", async function (){
  await parar();
  const legado = {
    jwtSecret: "prueba-" + Date.now() + "-abcdefabcdefabcdefabcdef",
    users: [{ dni: "JEFELEGADO", nombre: "Jefe legado", role: "admin", passwordHash: bcrypt.hashSync("Jefe.2026", 10) }],
    roster: [], sanciones: [], rebajes: [], refuerzos: []
  };
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify(legado));
  await arrancar();
  const sa = new Cliente(); await sa.login("JEFELEGADO", "Jefe.2026");
  assert.strictEqual((await sa.pedir("POST", "/api/superadmin/secciones", { compania: 1, seccion: 2, dni: "JEFE12", nombre: "Jefe 1-2", password: "Jefe.2026" })).status, 201);
  const otro = new Cliente(); await otro.login("JEFE12", "Jefe.2026");
  assert.strictEqual((await otro.pedir("POST", "/api/admin/usuarios", { dni: "SUPERADMIN", nombre: "Falso", password: "123456" })).status, 400);
  assert.strictEqual((await otro.pedir("GET", "/api/superadmin/secciones")).status, 403);
});
