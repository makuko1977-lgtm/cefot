// Pruebas del informe imprimible del Súper Administrador.
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
const PORT = 3997;
const B = "http://127.0.0.1:" + PORT;
let dir, proc, sa;

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
  async pedir(metodo, ruta){
    const h = { "Content-Type": "application/json" };
    if (this.cookie) h.Cookie = this.cookie;
    const r = await fetch(B + ruta, { method: metodo, headers: h });
    const sc = r.headers.get("set-cookie"); if (sc) this.cookie = sc.split(";")[0];
    let json = null; try { json = await r.json(); } catch (e){}
    return { status: r.status, json: json };
  }
  async login(dni, password){
    const r = await fetch(B + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dni: dni, password: password }) });
    const sc = r.headers.get("set-cookie"); if (sc) this.cookie = sc.split(";")[0];
    return r.status;
  }
}

before(async function (){
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "cefot-informe-"));
  const h = bcrypt.hashSync("Clave.2026", 10);
  const tenant = function (cia, sec, users){
    return { compania: cia, seccion: sec, nombre: cia + "ª Compañía · Sección " + sec, users: users,
      roster: [{ numero: String(cia) + String(sec) + "001", ape1: "Uno", ape2: "Dos", nombre: "Alumno", peloton: "1", dni: "11111111H", telefono: "600111222" }],
      bajas: [], sanciones: [{ id: "s1" }], rebajes: [], refuerzos: [], actividades: [], horasUaFechas: {} };
  };
  fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify({
    jwtSecret: "prueba-informe-abcdefabcdefabcdefabcdefabcdef",
    superAdmins: [{ dni: "SUPERADMIN", nombre: "SA", passwordHash: h }],
    capitanes: [{ dni: "12345678Z", nombre: "Capitán Tercera", compania: 3, passwordHash: h }, { dni: "CAP1", nombre: "Capitán Primera", compania: 1, passwordHash: h }],
    jefesEstudios: [{ dni: "ESTUDIOS", nombre: "JE", passwordHash: h }],
    tenants: {
      "3-3": tenant(3, 3, [
        { dni: "87654321X", nombre: "Jefe Tres-Tres", role: "admin", passwordHash: h },
        { dni: "X1234567L", nombre: "Pelotón NIE", role: "instructor", permisos: { fotos: true }, passwordHash: h },
        { dni: "PELOTON1", nombre: "Pelotón Usuario", role: "instructor", passwordHash: h }]),
      "1-2": tenant(1, 2, [{ dni: "JEFE12", nombre: "Jefe Uno-Dos", role: "admin", passwordHash: h }])
    }
  }));
  await arrancar();
  sa = new Cliente(); await sa.login("SUPERADMIN", "Clave.2026");
});
after(async function (){
  await new Promise(function (r){ if (!proc || proc.exitCode !== null) return r(); proc.once("exit", r); proc.kill(); });
  fs.rmSync(dir, { recursive: true, force: true });
});

test("solo el Súper Administrador puede sacar el informe", async function (){
  const j = new Cliente(); await j.login("JEFE12", "Clave.2026");
  assert.strictEqual((await j.pedir("GET", "/api/superadmin/informe")).status, 403);
});

test("los DNI/NIE salen codificados y nunca hay contraseñas", async function (){
  const r = await sa.pedir("GET", "/api/superadmin/informe");
  assert.strictEqual(r.status, 200);
  const texto = JSON.stringify(r.json);
  for (const dni of ["87654321X", "X1234567L", "12345678Z"]) assert.ok(!texto.includes(dni), dni + " no debería salir entero");
  assert.ok(!texto.includes("passwordHash") && !texto.includes("$2"), "no debe haber contraseñas ni sus huellas");
  const s33 = r.json.secciones.find(function (s){ return s.id === "3-3"; });
  assert.deepStrictEqual(s33.usuarios.map(function (u){ return u.usuario; }), ["••••••21X", "••••••67L", "PELOTON1"]);
  assert.strictEqual(s33.usuarios[0].rol, "Jefe de sección");
  assert.strictEqual(s33.usuarios.find(function (u){ return u.nombre === "Pelotón NIE"; }).permisos.fotos, true);
  assert.strictEqual(r.json.capitanes.find(function (c){ return c.compania === 3; }).usuario, "••••••78Z");
  assert.strictEqual(r.json.secciones[0].alumnos, undefined, "sin pedirlo no van los alumnos");
});

test("codificar todos oculta también los usuarios que no son DNI", async function (){
  const r = await sa.pedir("GET", "/api/superadmin/informe?codificarTodos=1");
  const s33 = r.json.secciones.find(function (s){ return s.id === "3-3"; });
  assert.ok(s33.usuarios.every(function (u){ return u.usuario.includes("•"); }));
});

test("filtro por compañía y listado de alumnos sin DNI ni teléfono", async function (){
  const r = await sa.pedir("GET", "/api/superadmin/informe?compania=3&alumnos=1");
  assert.deepStrictEqual(r.json.secciones.map(function (s){ return s.id; }), ["3-3"]);
  assert.deepStrictEqual(r.json.capitanes.map(function (c){ return c.compania; }), [3]);
  const al = r.json.secciones[0].alumnos[0];
  assert.deepStrictEqual(Object.keys(al).sort(), ["ape1", "ape2", "nombre", "numero", "peloton"]);
  const r2 = await sa.pedir("GET", "/api/superadmin/informe?compania=3&seccion=1");
  assert.strictEqual(r2.json.secciones.length, 0);
});
