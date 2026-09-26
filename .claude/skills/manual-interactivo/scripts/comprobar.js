// Comprueba el HTML montado: sin errores JS y sin desplazamiento horizontal,
// en tema oscuro, a ancho de PC (1280) y de móvil (400). Deja capturas.
// Uso: NODE_PATH=$(npm root -g) node comprobar.js <carpeta> [rol]
const { chromium } = require('playwright'); const S = process.argv[2]; const ROL = process.argv[3] || 'seccion';
(async()=>{ const b = await chromium.launch(); const e = [];
 for (const [w,h,tag] of [[1280,860,'pc'],[400,860,'movil']]){
  const p = await (await b.newContext({viewport:{width:w,height:h}, colorScheme:'dark'})).newPage(); p.on('pageerror',x=>e.push(x.message));
  await p.goto('file://'+require('path').resolve(S)+'/manual-interactivo.html'); await p.click(`#roles button[data-rol="${ROL}"]`); await p.waitForTimeout(300);
  if (await p.locator('.zona').count()) for (let i=0;i<3;i++){ await p.click('.zona'); await p.waitForTimeout(120); }
  await p.screenshot({path:`${S}/comprobar_${tag}.png`, fullPage: tag==='movil'});
  const ancho = await p.evaluate(()=>document.documentElement.scrollWidth);
  console.log(tag, 'ancho documento', ancho, ancho > w ? '<-- DESBORDA' : 'ok');
 } console.log('errores JS', e.length ? e : 'ninguno'); await b.close(); })();
