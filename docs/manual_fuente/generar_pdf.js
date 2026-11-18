// Genera docs/Manual_usuario_CEFOT2.pdf a partir de docs/manual_fuente/manual.html.
//
// Uso (desde la raíz del repositorio):
//   NODE_PATH=$(npm root -g) node docs/manual_fuente/generar_pdf.js [salida.pdf]
//
// Necesita Playwright (Chromium) y `pdftotext` (poppler-utils).
// Hace dos pasadas: en la primera mira en qué página cae cada apartado y en la
// segunda escribe esos números en el índice (que además enlaza a cada apartado
// y sale como marcadores del PDF).
"use strict";
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const FUENTE = path.join(__dirname, "manual.html");
const SALIDA = path.resolve(process.argv[2] || path.join(__dirname, "..", "Manual_usuario_CEFOT2.pdf"));

function normaliza(s){ return String(s).replace(/\s+/g, " ").trim(); }

function textoPorPagina(pdf){
  const total = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())[1]);
  const paginas = [];
  for (let i = 1; i <= total; i++){
    paginas.push(normaliza(execFileSync("pdftotext", ["-f", String(i), "-l", String(i), "-layout", pdf, "-"]).toString()));
  }
  return paginas;
}

async function generar(pagina, paginas, destino){
  await pagina.addInitScript(function (p){ window.PAGINAS = p; }, paginas || {});
  await pagina.goto("file://" + FUENTE);
  await pagina.waitForLoadState("networkidle");
  const version = await pagina.evaluate(function (){ return window.VERSION; });
  const pie = '<div style="width:100%;font-family:DejaVu Sans,sans-serif;font-size:7.5pt;color:#666;padding:0 15mm;display:flex;justify-content:space-between;">' +
    "<span>CEFOT-2 · Manual de usuario · " + version + '</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>';
  await pagina.pdf({
    path: destino, format: "A4", printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: pie,
    outline: true, tagged: true
  });
  return pagina.evaluate(function (){ return window.ENTRADAS; });
}

(async function (){
  const navegador = await chromium.launch();
  const tmp = path.join(os.tmpdir(), "manual_cefot_pasada.pdf");
  let paginas = {}, previas = null;
  for (let pasada = 1; pasada <= 4; pasada++){
    const ctx = await navegador.newContext();
    const pagina = await ctx.newPage();
    const entradas = await generar(pagina, paginas, tmp);
    await ctx.close();
    const textos = textoPorPagina(tmp);
    const nuevas = {};
    entradas.forEach(function (e){
      const buscado = normaliza(e.texto);
      // La página 1 es la portada con el índice: se busca a partir de la 2.
      for (let i = 1; i < textos.length; i++){
        if (textos[i].indexOf(buscado) !== -1){ nuevas[e.id] = i + 1; break; }
      }
      if (!nuevas[e.id]) console.warn("Aviso: no se encuentra en el PDF «" + buscado + "»");
    });
    if (previas && JSON.stringify(nuevas) === JSON.stringify(previas)){
      fs.copyFileSync(tmp, SALIDA);
      console.log("PDF generado: " + SALIDA + " · " + textos.length + " páginas (pasada " + pasada + ")");
      console.log("Índice: " + entradas.map(function (e){ return e.texto.slice(0, 28) + " → " + nuevas[e.id]; }).join(" | "));
      await navegador.close();
      return;
    }
    previas = nuevas; paginas = nuevas;
  }
  await navegador.close();
  throw new Error("El índice no se estabiliza tras 4 pasadas.");
})().catch(function (e){ console.error(e); process.exit(1); });
