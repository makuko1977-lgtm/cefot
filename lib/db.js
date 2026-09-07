// Almacén de datos: guarda TODO el estado de la aplicación como un único objeto JSON.
const crypto = require("crypto");

function emptyTenant(compania, seccion){
  return {
    compania: compania, seccion: seccion,
    nombre: compania + "ª Compañía · Sección " + seccion,
    users: [], roster: [], rosterUpdatedAt: null, rosterUpdatedBy: null,
    sanciones: [], rebajes: [], refuerzos: [], expedienteCounter: 0,
    cursosHistorial: [], actividades: [], actividadesSeeded: { FFMG: false, FFE: false }
  };
}
const ACTIVIDADES_FFE_SEED = ["MARCHA 15KM","TIRO 1","TIRO 2","JIP","CONFERENCIAS DIPE","MARCHA 25KM","CONFERENCIAS DIAPER","TIRO 3","EXAMEN E. FÍSICA","EXAMEN PMC","EJERCICIO ALFA","EXAMEN TEÓRICO","RECUPERACIÓN PMC","RECUPERACIÓN E.F.","RECUPERACIÓN TEOR.","VACUNACIONES","CONFIRMACIÓN"];
const ACTIVIDADES_FFMG_SEED = ["MARCHA 08 KM","MARCHA 12 KM","MARCHA 20 KM","JIP I","JIP II","MANIOBRAS","EXAMEN TEORICOS","EXAMEN PRUEBAS FISICAS","RECUPERACIÓN PRUEBAS FISICAS","RECUPERACIÓN TEORICAS","TIRO I","TIRO II","NOPTEL","TIRO III","JURA DE BANDERA"];
function emptyData(){
  return { jwtSecret: crypto.randomBytes(48).toString("hex"), superAdmins: [], capitanes: [], jefesEstudios: [], tenants: {} };
}
function tenantKey(compania, seccion){ return String(compania) + "-" + String(seccion); }
function migrateLegacyShape(raw){
  const key = tenantKey(3, 3);
  const tenant = emptyTenant(3, 3);
  tenant.users = (Array.isArray(raw.users) ? raw.users : []).map(function (u){ const copy = Object.assign({}, u); if (copy.role === "admin") copy.superAdmin = true; return copy; });
  tenant.roster = Array.isArray(raw.roster) ? raw.roster : [];
  tenant.rosterUpdatedAt = raw.rosterUpdatedAt || null;
  tenant.rosterUpdatedBy = raw.rosterUpdatedBy || null;
  tenant.sanciones = Array.isArray(raw.sanciones) ? raw.sanciones : [];
  tenant.rebajes = Array.isArray(raw.rebajes) ? raw.rebajes : [];
  tenant.refuerzos = Array.isArray(raw.refuerzos) ? raw.refuerzos : [];
  tenant.expedienteCounter = raw.expedienteCounter || 0;
  tenant.cursosHistorial = Array.isArray(raw.cursosHistorial) ? raw.cursosHistorial : [];
  const out = emptyData();
  out.jwtSecret = raw.jwtSecret || out.jwtSecret;
  out.tenants[key] = tenant;
  return out;
}
function normalizeLoaded(raw){
  if (!raw || (!raw.tenants && !raw.roster && !raw.users)) return emptyData();
  if (raw.tenants){
    const merged = emptyData();
    merged.jwtSecret = raw.jwtSecret || merged.jwtSecret;
    merged.superAdmins = Array.isArray(raw.superAdmins) ? raw.superAdmins : [];
    merged.capitanes = Array.isArray(raw.capitanes) ? raw.capitanes : [];
    merged.jefesEstudios = Array.isArray(raw.jefesEstudios) ? raw.jefesEstudios : [];
    merged.tenants = raw.tenants;
    return merged;
  }
  return migrateLegacyShape(raw);
}
let data = emptyData();
function createFileBackend(){
  const fs = require("fs"); const path = require("path");
  const DATA_FILE = path.join(__dirname, "..", "data", "data.json");
  function load(){ try { return normalizeLoaded(JSON.parse(fs.readFileSync(DATA_FILE, "utf8"))); } catch (err){ return emptyData(); } }
  function save(){ fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); const tmp = DATA_FILE + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8"); fs.renameSync(tmp, DATA_FILE); return Promise.resolve(); }
  return { init: function (){ const existia = fs.existsSync(DATA_FILE); data = load(); if (!existia) save(); return Promise.resolve(); }, save: save, saveStrict: save };
}
function createPostgresBackend(){
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL_NO_VERIFY === "false" ? undefined : { rejectUnauthorized: false } });
  let queue = Promise.resolve();
  return {
    init: async function (){
      await pool.query("CREATE TABLE IF NOT EXISTS app_store (id INT PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())");
      const res = await pool.query("SELECT payload FROM app_store WHERE id = 1");
      if (res.rows.length) data = normalizeLoaded(res.rows[0].payload);
      else { data = emptyData(); await pool.query("INSERT INTO app_store (id, payload) VALUES (1, $1)", [JSON.stringify(data)]); }
    },
    save: function (){ const snapshot = JSON.stringify(data); queue = queue.then(function (){ return pool.query("UPDATE app_store SET payload = $1, updated_at = now() WHERE id = 1", [snapshot]); }).catch(function (err){ console.error("Error guardando en la base de datos:", err.message || err); }); return queue; },
    saveStrict: function (){ const snapshot = JSON.stringify(data); const attempt = queue.then(function (){ return pool.query("UPDATE app_store SET payload = $1, updated_at = now() WHERE id = 1", [snapshot]); }); queue = attempt.catch(function (err){ console.error("Error guardando en la base de datos:", err.message || err); }); return attempt; }
  };
}
const backend = process.env.DATABASE_URL ? createPostgresBackend() : createFileBackend();
function tenant(id){ return id ? data.tenants[id] : undefined; }
function createTenant(compania, seccion){ const key = tenantKey(compania, seccion); if (!data.tenants[key]) data.tenants[key] = emptyTenant(compania, seccion); return data.tenants[key]; }
function deleteTenant(id){ if (!id || !data.tenants[id]) return false; delete data.tenants[id]; return true; }
function listTenants(){ return Object.keys(data.tenants).map(function (key){ return Object.assign({ id: key }, data.tenants[key]); }); }
function findInTenants(dni){
  const keys = Object.keys(data.tenants);
  for (let i = 0; i < keys.length; i++){
    const t = data.tenants[keys[i]];
    const u = t.users.find(function (x){ return x.dni === dni; });
    if (u) return { user: u, tenantId: keys[i], role: u.role };
  }
  return null;
}
function findUserGlobal(dni){
  const inTenant = findInTenants(dni);
  const sa = data.superAdmins.find(function (u){ return u.dni === dni; });
  if (inTenant){
    return {
      user: inTenant.user,
      tenantId: inTenant.tenantId,
      role: inTenant.role,
      superAdmin: !!(inTenant.user.superAdmin || sa),
      capitanCompania: null,
      jefeEstudios: false
    };
  }
  if (sa) return { user: sa, tenantId: null, role: null, superAdmin: true, capitanCompania: null, jefeEstudios: false };
  const cap = data.capitanes.find(function (u){ return u.dni === dni; });
  if (cap) return { user: cap, tenantId: null, role: null, superAdmin: false, capitanCompania: cap.compania, jefeEstudios: false };
  const je = (data.jefesEstudios || []).find(function (u){ return u.dni === dni; });
  if (je) return { user: je, tenantId: null, role: null, superAdmin: false, capitanCompania: null, jefeEstudios: true };
  return null;
}
function findCapitanByCompania(compania){ return data.capitanes.find(function (c){ return Number(c.compania) === Number(compania); }) || null; }
function ensureActividadesShape(tenant){ if (!Array.isArray(tenant.actividades)) tenant.actividades = []; if (!tenant.actividadesSeeded || typeof tenant.actividadesSeeded !== "object") tenant.actividadesSeeded = { FFMG: false, FFE: false }; }
function seedActividadesFaseIfNeeded(tenant, fase){
  ensureActividadesShape(tenant);
  if (tenant.actividadesSeeded[fase]) return false;
  const yaHay = tenant.actividades.some(function (a){ return a.fase === fase; });
  tenant.actividadesSeeded[fase] = true;
  if (yaHay) return false;
  const seed = fase === "FFMG" ? ACTIVIDADES_FFMG_SEED : ACTIVIDADES_FFE_SEED;
  seed.forEach(function (nombre, i){ tenant.actividades.push({ id: crypto.randomUUID(), fase: fase, nombre: nombre, orden: i + 1, fecha: "", participantes: [], createdAt: new Date().toISOString() }); });
  return true;
}
module.exports = { get data(){ return data; }, save: function (){ return backend.save(); }, saveStrict: function (){ return backend.saveStrict(); }, init: function (){ return backend.init(); }, usingDatabase: !!process.env.DATABASE_URL, tenant: tenant, createTenant: createTenant, deleteTenant: deleteTenant, listTenants: listTenants, tenantKey: tenantKey, findUserGlobal: findUserGlobal, findCapitanByCompania: findCapitanByCompania, ensureActividadesShape: ensureActividadesShape, seedActividadesFaseIfNeeded: seedActividadesFaseIfNeeded };
