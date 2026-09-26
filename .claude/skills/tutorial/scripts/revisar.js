// Hoja de revisión: para cada demostración, una imagen con todos sus pasos en
// miniatura, la zona roja dibujada y el título/texto de cada paso.
// Uso: NODE_PATH=$(npm root -g) node revisar.js <carpeta> [demo1,demo2]
// Escribe <carpeta>/revision_<demo>.png
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const S = process.argv[2]; const SOLO = (process.argv[3] || '').split(',').filter(Boolean);
(async()=>{
  const demos = JSON.parse(fs.readFileSync(`${S}/demos.json`, 'utf8'));
  const b = await chromium.launch();
  for (const [nombre, d] of Object.entries(demos)){
    if (SOLO.length && SOLO.indexOf(nombre) === -1) continue;
    const ancho = d.movil ? 260 : 620, cols = d.movil ? 5 : 2;
    const html = `<body style="margin:8px;font:12px sans-serif;background:#fff"><h2 style="margin:4px">${nombre}</h2>
      <div style="display:grid;grid-template-columns:repeat(${cols},${ancho}px);gap:10px">` +
      d.pasos.map((p,i)=>`<div><div style="position:relative;width:${ancho}px;line-height:0">
        <img src="file://${path.resolve(S, p.img)}" style="width:100%">
        ${p.caja ? `<div style="position:absolute;border:3px solid red;left:${p.caja.x}%;top:${p.caja.y}%;width:${p.caja.w}%;height:${p.caja.h}%"></div>` : ''}
        </div><b>${i+1}. ${p.titulo}</b><br>${p.texto}</div>`).join('') + '</div></body>';
    const f = `${S}/revision_${nombre}.html`; fs.writeFileSync(f, html);
    const pg = await b.newPage({viewport:{width: cols*(ancho+10)+20, height:600}});
    await pg.goto('file://' + path.resolve(f)); await pg.waitForTimeout(300);
    await pg.screenshot({path:`${S}/revision_${nombre}.png`, fullPage:true}); await pg.close(); fs.unlinkSync(f);
    console.log('revision_' + nombre + '.png');
  }
  await b.close();
})();
