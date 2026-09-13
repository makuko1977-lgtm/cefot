// Envío de correo saliente (copia de seguridad por email). Configurado por
// variables de entorno, sin ningún dato sensible en el código — el jefe de
// sección nunca introduce contraseñas de correo en la aplicación, se
// configuran una única vez como variables de entorno del servidor (ver
// .env.example / render.yaml).
//
// Pensado por defecto para Gmail / Google Workspace con una "contraseña de
// aplicación" (no la contraseña normal de la cuenta — requiere verificación
// en dos pasos activada: Cuenta de Google > Seguridad > Verificación en dos
// pasos > Contraseñas de aplicaciones), pero funciona con cualquier
// proveedor SMTP estándar cambiando SMTP_HOST/SMTP_PORT.
const nodemailer = require("nodemailer");

let cachedTransporter = null;
let cachedConfigKey = null;

function readConfig(){
  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || ""
  };
}

// true solo si hay lo mínimo imprescindible para poder enviar algo. Se
// comprueba en caliente (no al arrancar el servidor) para poder dar un
// mensaje de error claro en el momento del envío en vez de tumbar el
// arranque si todavía no se han configurado las variables de entorno.
function isConfigured(){
  const c = readConfig();
  return !!(c.host && c.user && c.pass && c.from);
}

function getTransporter(){
  const c = readConfig();
  const key = c.host + "|" + c.port + "|" + c.secure + "|" + c.user + "|" + c.pass;
  if (cachedTransporter && cachedConfigKey === key) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass }
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

// Envía la copia de seguridad (JSON) como adjunto a una única dirección.
// `remitenteNombre` es solo el nombre visible del remitente (p. ej. "CEFOT-2
// BAL/3ª Compañía · Sección 3"); la dirección real del remitente es siempre
// la de SMTP_FROM/SMTP_USER — así el destinatario ve un nombre reconocible
// aunque la cuenta de correo real sea genérica.
async function enviarCopiaSeguridad({ to, remitenteNombre, asunto, textoPlano, adjuntoNombre, adjuntoJson }){
  if (!isConfigured()){
    const err = new Error(
      "El servidor todavía no tiene configurado el envío de correo (faltan las variables de entorno SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM)."
    );
    err.code = "SMTP_NOT_CONFIGURED";
    throw err;
  }
  const c = readConfig();
  const transporter = getTransporter();
  const from = remitenteNombre ? `"${remitenteNombre.replace(/"/g, "")}" <${c.from}>` : c.from;

  await transporter.sendMail({
    from: from,
    to: to,
    subject: asunto,
    text: textoPlano,
    attachments: [
      {
        filename: adjuntoNombre,
        content: JSON.stringify(adjuntoJson, null, 2),
        contentType: "application/json"
      }
    ]
  });
}

module.exports = { isConfigured, enviarCopiaSeguridad };
