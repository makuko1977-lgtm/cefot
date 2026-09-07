const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");

const db = require("./lib/db");
const auth = require("./lib/auth");

const app = express();

// Si se despliega detrás de un proxy inverso (Nginx, un PaaS, etc.), hay que
// decírselo explícitamente a Express para que req.ip y las cookies "secure"
// se calculen a partir de la cabecera X-Forwarded-* del proxy y no del socket
// TCP directo. Se activa solo con la variable de entorno TRUST_PROXY (por
// ejemplo TRUST_PROXY=1) para no fiarse de esa cabecera si no hay proxy
// delante (si no hay proxy, cualquiera podría falsear su IP con ella).
if (process.env.TRUST_PROXY){
  app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : process.env.TRUST_PROXY);
}

app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());

// ---------------- cabeceras de seguridad básicas ----------------
app.use(function (req, res, next){
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

// ---------------- API ----------------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/roster", require("./routes/roster"));
app.use("/api/sanciones", require("./routes/sanciones"));
app.use("/api/rebajes", require("./routes/rebajes"));
app.use("/api/refuerzos", require("./routes/refuerzos"));
app.use("/api/actividades", require("./routes/actividades"));
app.use("/api/consultas", require("./routes/consultas"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/capitan", require("./routes/capitan"));

// ---------------- frontend estático ----------------
app.use(express.static(path.join(__dirname, "public")));

app.use(function (req, res){
  res.status(404).json({ error: "No encontrado." });
});

async function start(){
  // Carga el estado guardado (de Postgres si hay DATABASE_URL, o del
  // fichero local si no) antes de aceptar ninguna petición. Si los datos
  // todavía estaban en el formato antiguo (una sola sección, sin
  // compañías), db.init() ya los migra automáticamente al formato nuevo.
  await db.init();

  // ---------------- crea un Súper Administrador por defecto si no hay nada ----------------
  // Solo ocurre en una instalación totalmente nueva (sin secciones ni
  // súper administradores todavía) — no en una que se acaba de migrar desde
  // el formato antiguo, porque esa ya trae su propio Súper Administrador
  // (el que antes era el único admin).
  if (!db.data.superAdmins.length && !Object.keys(db.data.tenants).length){
    const dni = "SUPERADMIN";
    const password = crypto.randomBytes(4).toString("hex"); // 8 caracteres al azar
    db.data.superAdmins.push({
      dni: dni,
      nombre: "Súper Administrador",
      passwordHash: auth.hashPassword(password),
      createdAt: new Date().toISOString()
    });
    await db.save();
    console.log("========================================================");
    console.log(" Instalación nueva: se ha creado un Súper Administrador.");
    console.log(" DNI:        " + dni);
    console.log(" Contraseña: " + password);
    console.log(" Entra en /login.html, crea tu primera sección y cámbiala.");
    console.log("========================================================");
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, function (){
    console.log("Servidor CEFOT-2 escuchando en el puerto " + PORT + " (almacén: " + (db.usingDatabase ? "base de datos Postgres" : "fichero local") + ")");
  });
}

start().catch(function (err){
  console.error("No se pudo arrancar el servidor:", err);
  process.exit(1);
});
