// Almacén de datos: guarda TODO el estado de la aplicación como un único
// objeto JSON. Dos modos, elegidos automáticamente (igual que antes):
//
//   - Sin la variable de entorno DATABASE_URL: fichero local (data/data.json).
//   - Con DATABASE_URL definida: una fila de una tabla Postgres.
//
// ---------------- estructura multi-sección ----------------
// El CEFOT-2 se compone de varias compañías (1ª a 4ª), cada una con varias
// secciones propias (1ª a 5ª). Cada sección es un compartimento aislado con
// su propio roster, sanciones, rebajes, refuerzos y sus propios usuarios
// (un jefe de sección — internamente sigue llamándose "admin" — y sus
// jefes de pelotón, internamente "instructor"). Nada de esto se comparte ni
// se mezcla entre secciones.
//
// Por encima de todas las secciones hay un Súper Administrador: da de alta
// secciones nuevas (creando a su jefe de sección) y puede consultar un
// resumen de solo lectura de cualquiera, sin entrar a editar sus datos.
// Ser Súper Administrador es un permiso adicional (el campo `superAdmin`),
// no una cuenta aparte: la misma persona puede ser, a la vez, jefe de
// sección de su propia sección Y Súper Administrador de todas — con una
// única contraseña, sin duplicar nada. Solo hace falta una lista aparte
// (`superAdmins`) para el caso, más raro, de alguien que sea Súper
// Administrador sin tener ninguna sección propia.
//
// `db.data` sigue siendo el objeto raíz en memoria. Para trabajar con una
// sección concreta se usa `db.tenant(id)` (id = "compañía-sección", p. ej.
// "3-3"), que devuelve el objeto de esa sección (incluidos sus usuarios).

const crypto = require("crypto");

function emptyTenant(compania, seccion){
  return {
    compania: compania,
    seccion: seccion,
    nombre: compania + "ª Compañía · Sección " + seccion,
    // { dni, nombre, passwordHash, role: "admin"|"instructor", superAdmin: bool, permisos, createdAt }
    users: [],
    roster: [],          // { numero, ape1, ape2, nombre, peloton, sexo, unidad, dni, telefono }
    rosterUpdatedAt: null,
    rosterUpdatedBy: null,
    sanciones: [],
    rebajes: [],
    refuerzos: [],
    expedienteCounter: 0,
    cursosHistorial: []  // { fecha, cerradoPor, sanciones, rebajes, refuerzos, roster, incluyoRoster }
  };
}

function emptyData(){
  return {
    jwtSecret: crypto.randomBytes(48).toString("hex"),
    // Solo para Súper Administradores SIN sección propia: { dni, nombre, passwordHash, createdAt }
    superAdmins: [],
    // Capitanes de compañía: uno como máximo por compañía (1ª-4ª). No tienen
    // sección propia — su acceso abarca las 5 secciones de su compañía, con
    // el mismo poder que un jefe de sección sobre sanciones/rebajes/
    // refuerzos/consultas/historial, pero sin gestionar roster ni usuarios.
    // { dni, nombre, passwordHash, compania, createdAt }
    capitanes: [],
    // "compañía-sección" (p. ej. "3-3") -> objeto de esa sección.
    tenants: {}
  };
}

function tenantKey(compania, seccion){
  return String(compania) + "-" + String(seccion);
}

// ---------------- migración desde el formato antiguo (una sola sección) ----------------
// Versiones anteriores de esta aplicación solo servían una sección: todo
// (usuarios, roster, sanciones...) vivía en un único bloque plano, sin
// noción de compañía/sección. Si se detecta ese formato antiguo, se
// convierte automáticamente al nuevo formato multi-sección la primera vez
// que arranca el servidor, sin que haga falta ningún paso manual:
//   - Esos datos pasan a ser la sección "3-3" (3ª Compañía · Sección 3),
//     que es la que ya se venía usando.
//   - Cualquier usuario que ya tuviera el rol "admin" (jefe de sección)
//     conserva su misma cuenta y contraseña, y además se marca como Súper
//     Administrador (`superAdmin: true`) — así nadie pierde acceso a nada
//     de lo que ya tenía, con una única contraseña.
function migrateLegacyShape(raw){
  const TENANT_COMPANIA = 3;
  const TENANT_SECCION = 3;
  const key = tenantKey(TENANT_COMPANIA, TENANT_SECCION);

  const tenant = emptyTenant(TENANT_COMPANIA, TENANT_SECCION);
  tenant.users = (Array.isArray(raw.users) ? raw.users : []).map(function (u){
    const copy = Object.assign({}, u);
    if (copy.role === "admin") copy.superAdmin = true;
    return copy;
  });
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

// A partir de lo que se ha leído (del fichero o de Postgres), decide si hay
// que migrar del formato antiguo, o si ya está en el formato nuevo.
function normalizeLoaded(raw){
  if (!raw || (!raw.tenants && !raw.roster && !raw.users)){
    // Instalación nueva, sin datos todavía.
    return emptyData();
  }
  if (raw.tenants){
    // Ya en formato nuevo: se completa con los valores por defecto que
    // falten (por si se añaden campos nuevos en el futuro).
    const merged = emptyData();
    merged.jwtSecret = raw.jwtSecret || merged.jwtSecret;
    merged.superAdmins = Array.isArray(raw.superAdmins) ? raw.superAdmins : [];
    merged.capitanes = Array.isArray(raw.capitanes) ? raw.capitanes : [];
    merged.tenants = raw.tenants;
    return merged;
  }
  // Formato antiguo (una sola sección, sin tenants).
  return migrateLegacyShape(raw);
}

let data = emptyData();

// ---------------- modo fichero (local, sin base de datos) ----------------
function createFileBackend(){
  const fs = require("fs");
  const path = require("path");
  const DATA_DIR = path.join(__dirname, "..", "data");
  const DATA_FILE = path.join(DATA_DIR, "data.json");

  function load(){
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      return normalizeLoaded(JSON.parse(raw));
    } catch (err){
      return emptyData();
    }
  }

  function save(){
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmp, DATA_FILE);
    return Promise.resolve();
  }

  return {
    init: function (){
      const existiaFichero = fs.existsSync(DATA_FILE);
      data = load();
      if (!existiaFichero){
        save();
      }
      return Promise.resolve();
    },
    save: save,
    saveStrict: save
  };
}

// ---------------- modo Postgres (para hosting sin disco persistente) ----------------
function createPostgresBackend(){
  const { Pool } = require("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL_NO_VERIFY === "false" ? undefined : { rejectUnauthorized: false }
  });

  let queue = Promise.resolve();

  return {
    init: async function (){
      await pool.query(
        "CREATE TABLE IF NOT EXISTS app_store (id INT PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())"
      );
      const res = await pool.query("SELECT payload FROM app_store WHERE id = 1");
      if (res.rows.length){
        data = normalizeLoaded(res.rows[0].payload);
      } else {
        data = emptyData();
        await pool.query("INSERT INTO app_store (id, payload) VALUES (1, $1)", [JSON.stringify(data)]);
      }
    },
    save: function (){
      const snapshot = JSON.stringify(data);
      queue = queue
        .then(function (){
          return pool.query("UPDATE app_store SET payload = $1, updated_at = now() WHERE id = 1", [snapshot]);
        })
        .catch(function (err){
          console.error("Error guardando en la base de datos:", err.message || err);
        });
      return queue;
    },
    saveStrict: function (){
      const snapshot = JSON.stringify(data);
      const attempt = queue.then(function (){
        return pool.query("UPDATE app_store SET payload = $1, updated_at = now() WHERE id = 1", [snapshot]);
      });
      queue = attempt.catch(function (err){
        console.error("Error guardando en la base de datos:", err.message || err);
      });
      return attempt;
    }
  };
}

const backend = process.env.DATABASE_URL ? createPostgresBackend() : createFileBackend();

// ---------------- helpers multi-sección ----------------

function tenant(id){
  return id ? data.tenants[id] : undefined;
}

function createTenant(compania, seccion){
  const key = tenantKey(compania, seccion);
  if (!data.tenants[key]){
    data.tenants[key] = emptyTenant(compania, seccion);
  }
  return data.tenants[key];
}

// Elimina una sección entera (y con ella su jefe de sección, sus jefes de
// pelotón y todos sus datos: roster, sanciones, rebajes, refuerzos). Acción
// irreversible — la ruta que la usa exige confirmación explícita antes de
// llamarla. Si alguien tenía sesión abierta en esa sección, su token deja
// de servir en la siguiente petición (requireAuth ya contempla el caso de
// una sección que ha dejado de existir).
function deleteTenant(id){
  if (!id || !data.tenants[id]) return false;
  delete data.tenants[id];
  return true;
}

function listTenants(){
  return Object.keys(data.tenants).map(function (key){
    return Object.assign({ id: key }, data.tenants[key]);
  });
}

// Busca un DNI en todo el sistema: primero entre los Súper Administradores
// sin sección propia, luego entre los capitanes de compañía (tampoco tienen
// sección propia), y si no, entre los usuarios de todas las secciones.
// Se usa para el login (todavía no se sabe a qué sección/compañía pertenece
// quien intenta entrar) y para impedir DNIs duplicados al dar de alta un
// usuario, capitán o jefe de sección nuevo.
//
// Devuelve { user, tenantId, role, superAdmin, capitanCompania } o null.
//   - tenantId es null para un Súper Administrador o capitán sin sección propia.
//   - role es "admin" | "instructor" | null (null si no tiene sección).
//   - superAdmin es un booleano independiente del rol: alguien puede ser
//     jefe de sección (role: "admin") Y Súper Administrador a la vez.
//   - capitanCompania es la compañía (1-4) de la que es capitán, o null.
function findUserGlobal(dni){
  const sa = data.superAdmins.find(function (u){ return u.dni === dni; });
  if (sa) return { user: sa, tenantId: null, role: null, superAdmin: true, capitanCompania: null };

  const cap = data.capitanes.find(function (u){ return u.dni === dni; });
  if (cap) return { user: cap, tenantId: null, role: null, superAdmin: false, capitanCompania: cap.compania };

  const keys = Object.keys(data.tenants);
  for (let i = 0; i < keys.length; i++){
    const t = data.tenants[keys[i]];
    const u = t.users.find(function (x){ return x.dni === dni; });
    if (u) return { user: u, tenantId: keys[i], role: u.role, superAdmin: !!u.superAdmin, capitanCompania: null };
  }
  return null;
}

// Un solo capitán por compañía: usado al crear uno nuevo para impedir un
// segundo capitán sobre la misma compañía.
function findCapitanByCompania(compania){
  return data.capitanes.find(function (c){ return Number(c.compania) === Number(compania); }) || null;
}

module.exports = {
  get data(){ return data; },
  save: function (){ return backend.save(); },
  saveStrict: function (){ return backend.saveStrict(); },
  init: function (){ return backend.init(); },
  usingDatabase: !!process.env.DATABASE_URL,

  tenant: tenant,
  createTenant: createTenant,
  deleteTenant: deleteTenant,
  listTenants: listTenants,
  tenantKey: tenantKey,
  findUserGlobal: findUserGlobal,
  findCapitanByCompania: findCapitanByCompania
};
