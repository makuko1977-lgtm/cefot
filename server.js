const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cookieParser = require("cookie-parser");

const db = require("./lib/db");
const auth = require("./lib/auth");
const avisos = require("./lib/avisos");

const app = express();
const PUBLIC = path.join(__dirname, "public");

if (process.env.TRUST_PROXY){
  app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : process.env.TRUST_PROXY);
}

app.use(express.json({ limit: "20mb" }));
app.use(cookieParser());

app.use(function (req, res, next){
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/roster", require("./routes/roster"));
app.use("/api/sanciones", function (req, res, next){
  if (req.method === "POST" && (req.path === "/" || req.path === "")){
    const origJson = res.json.bind(res);
    res.json = function (body){
      if (res.statusCode === 201 && body && body.sancion && req.db){
        avisos.registrarParte(req.db, body.sancion, body.sancion.createdBy);
        db.save();
      }
      return origJson(body);
    };
  }
  next();
}, require("./routes/sanciones"));
app.use("/api/rebajes", require("./routes/rebajes"));
app.use("/api/refuerzos", require("./routes/refuerzos"));
app.use("/api/actividades", require("./routes/actividades"));
app.use("/api/consultas", require("./routes/consultas"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/admin", require("./routes/avisos"));
app.use("/api/superadmin", require("./routes/superadmin"));
app.use("/api/superadmin", require("./routes/jefesEstudiosAdmin"));
app.use("/api/capitan", require("./routes/capitan"));
app.use("/api/estudios", require("./routes/estudios"));

function injectScript(html, src){
  if (html.indexOf(src) !== -1) return html;
  return html.replace(/<\/body>/i, "<script src=\"" + src + "\"></script></body>");
}
function serveHtmlWithExtras(fileName, extraSrc){
  return function (req, res, next){
    const file = path.join(PUBLIC, fileName);
    fs.readFile(file, "utf8", function (err, html){
      if (err) return next();
      html = injectScript(html, extraSrc || "/shared/admin-extras.js");
      res.type("html").send(html);
    });
  };
}

app.get("/seccion3.html", serveHtmlWithExtras("seccion3.html"));
app.get("/seccion3_completo.html", serveHtmlWithExtras("seccion3_completo.html"));
app.get("/superadmin.html", serveHtmlWithExtras("superadmin.html", "/shared/superadmin-estudios.js"));
app.get("/instructor.html", serveHtmlWithExtras("instructor.html", "/shared/instructor-trabajo.js"));

app.use(express.static(PUBLIC));
app.use(function (req, res){
  res.status(404).json({ error: "No encontrado." });
});

async function start(){
  await db.init();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, function (){
    console.log("Servidor CEFOT-2 puerto " + PORT);
  });
}
start().catch(function (err){
  console.error("No se pudo arrancar el servidor:", err);
  process.exit(1);
});
