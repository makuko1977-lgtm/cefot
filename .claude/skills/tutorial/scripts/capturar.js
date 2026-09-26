// Captura los pasos de las demostraciones del manual interactivo.
// Para cada paso guarda: la imagen de la pantalla ANTES de la acción y el
// recuadro (en % de la pantalla) del elemento que hay que pulsar.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.argv[2] || 'manual-interactivo-build';
const BASE = process.env.BASE || 'http://localhost:3000';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, {recursive:true});
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
(async()=>{
  const b = await chromium.launch({args:['--lang=es-ES'], env:Object.assign({}, process.env, {LANG:'es_ES.UTF-8', LANGUAGE:'es_ES:es', LC_ALL:'es_ES.UTF-8'})});
  const hoy = new Date(); const mas = n=>{ const d=new Date(hoy); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
  const demos = {};

  async function grabadora(nombre, movil){
    const vp = movil ? {width:390,height:780} : {width:1280,height:780};
    const ctx = await b.newContext({viewport:vp, deviceScaleFactor: movil ? 2 : 1.25, isMobile:!!movil, hasTouch:!!movil, locale:'es-ES', timezoneId:'Europe/Madrid'});
    const p = await ctx.newPage(); p.on('dialog', d=>d.accept());
    const pasos = []; demos[nombre] = { movil: !!movil, ancho: vp.width, alto: vp.height, pasos: pasos };
    let n = 0;
    // Captura un paso: `sel` es lo que hay que pulsar (o null), `texto` lo que se explica.
    async function paso(sel, titulo, texto, opts={}){
      let caja = null;
      if (sel){
        const el = p.locator(sel).first();
        await el.scrollIntoViewIfNeeded().catch(()=>{});
        await p.waitForTimeout(250);
        const bb = await el.boundingBox();
        if (bb){ const m = opts.margen == null ? 4 : opts.margen;
          caja = { x:(bb.x-m)/vp.width*100, y:(bb.y-m)/vp.height*100, w:(bb.width+2*m)/vp.width*100, h:(bb.height+2*m)/vp.height*100 }; }
        else console.log('  sin caja para', sel);
      }
      await p.waitForTimeout(350);
      const archivo = `${nombre}_${String(++n).padStart(2,'0')}.jpg`;
      await p.screenshot({path:`${OUT}/${archivo}`, type:'jpeg', quality:72});
      pasos.push({ img: archivo, caja: caja, titulo: titulo, texto: texto });
      console.log(nombre, n, titulo);
    }
    async function firmar(canvasSel){
      const bb = await p.locator(canvasSel).boundingBox();
      await p.mouse.move(bb.x+25, bb.y+bb.height*0.6); await p.mouse.down();
      for (let i=0;i<14;i++) await p.mouse.move(bb.x+25+i*(bb.width-50)/14, bb.y+bb.height*(0.55+0.22*Math.sin(i*0.9)));
      await p.mouse.up();
    }
    return { p, ctx, paso, firmar };
  }

  // ======================= JEFE DE PELOTÓN · dar de alta un parte =======================
  {
    const { p, ctx, paso, firmar } = await grabadora('peloton_parte', true);
    await p.goto(BASE + '/login.html'); await p.waitForTimeout(800);
    await paso('#dni, input[type=text]', 'Entra en la aplicación', 'Abre <b>cefot.up.railway.app</b> y escribe tu <b>usuario</b>. Después, tu contraseña.');
    await p.fill('#dni, input[type=text]','PELOTON1'); await p.fill('input[type=password]','demo1234');
    await paso('button[type=submit], button:has-text("Entrar")', 'Pulsa «Entrar»', 'Con el usuario y la contraseña escritos, pulsa <b>Entrar</b>. La aplicación te lleva sola a tu pantalla.');
    await p.click('button[type=submit], button:has-text("Entrar")'); await p.waitForTimeout(2800);
    await paso('#modeIndividualBtn', 'Nueva sanción', 'Se abre directamente <b>Nueva sanción</b>. Elige <b>Individual</b> para un alumno o <b>Múltiple</b> si el parte es para varios (por ejemplo, una falta de un grupo).', {margen:6});
    await paso('#cadeteInput', 'Busca al alumno', 'Escribe su <b>número de protocolo</b>, su primer apellido o su nombre.');
    await p.fill('#cadeteInput','33012'); await p.waitForTimeout(900);
    await paso('#cadeteResults [data-numero]', 'Pulsa al alumno en la lista', 'Aparecen los alumnos que coinciden. <b>Pulsa el nombre</b> para seleccionarlo (si no lo pulsas, no queda elegido).');
    await p.locator('#cadeteResults [data-numero]').first().click(); await p.waitForTimeout(500);
    await paso('#sanFecha', 'Día, lugar y hora', 'El alumno queda seleccionado (con «Cambiar» puedes corregirlo). Rellena el <b>día</b>, el <b>lugar</b> y la <b>hora</b> de los hechos.');
    await p.fill('#sanFecha', mas(0)); await p.fill('#sanLugar','Patio de armas (ficticio)'); await p.fill('#sanHora','08:05');
    await paso('#sanTipoFalta', 'Tipo de falta', 'Elige si la falta es <b>Leve</b> o <b>Grave</b>. Según lo que elijas cambia la lista de fundamentos legales.');
    await p.selectOption('#sanTipoFalta','LEVE'); await p.waitForTimeout(300);
    await paso('#sanEmpleo', 'Quién da el parte', 'Datos del profesor que da el parte: <b>empleo</b>, nombre, apellidos y DNI.');
    await p.selectOption('#sanEmpleo',{index:3}); await p.fill('#sanProfNombreInput','Demo'); await p.fill('#sanProfApellidosInput','Uno');
    await paso('#sanFundamento', 'Fundamento legal', 'Elige el <b>fundamento legal</b> de la lista. No hace falta copiar ningún texto.');
    await p.selectOption('#sanFundamento',{index:1});
    await paso('#sanMotivoInput', 'Motivo', 'Describe <b>los hechos</b> con tus palabras.');
    await p.fill('#sanMotivoInput','No se presenta a la formación a la hora indicada (hecho ficticio).');
    await paso('#sanMedidaInput', 'Medida correctora que propones', 'Elige la medida que propones: amonestación verbal, trabajo (con fecha límite), refuerzo, arresto (con fechas) o sin medida. <b>El jefe de sección la revisará.</b>');
    await p.selectOption('#sanMedidaInput','Amonestación verbal'); await p.waitForTimeout(300);
    await paso('#sanSaveBtn', 'Guarda el parte', 'Revisa los datos y pulsa <b>Guardar sanción</b>.');
    await p.click('#sanSaveBtn'); await p.waitForTimeout(1200);
    await paso('#firmaPrevioCanvas', 'El alumno firma', 'Pásale el móvil al alumno para que <b>firme con el dedo</b> en el recuadro. <b>Sin su firma no se guarda el parte.</b>', {margen:2});
    await firmar('#firmaPrevioCanvas');
    await paso('#firmaPrevioSiguienteBtn', 'Confirma la firma', 'Pulsa <b>Firmar y guardar</b>. En un parte múltiple aparece <b>Firmar y continuar</b> y firma cada alumno por turno.');
    await p.click('#firmaPrevioSiguienteBtn'); await p.waitForTimeout(2500);
    await paso('button:has-text("Registrar otra sanción")', 'Parte registrado', 'Aparece el resumen con el <b>número de expediente</b>. El parte ya le ha llegado a tu jefe de sección. Pulsa <b>Registrar otra sanción</b> para empezar otro.');
    await paso(null, 'Fin', '¡Hecho! Tu jefe de sección revisará la medida que has propuesto.');
    await ctx.close();
  }

  // ======================= JEFE DE SECCIÓN · sanción propia =======================
  {
    const { p, ctx, paso, firmar } = await grabadora('seccion_sancion', false);
    await p.goto(BASE + '/login.html'); await p.waitForTimeout(800);
    await p.fill('#dni, input[type=text]','JEFE33'); await p.fill('input[type=password]','demo1234');
    await paso('button[type=submit], button:has-text("Entrar")', 'Entra en la aplicación', 'Escribe tu <b>usuario</b> y tu <b>contraseña</b> y pulsa <b>Entrar</b>.');
    await p.click('button[type=submit], button:has-text("Entrar")'); await p.waitForTimeout(3000);
    await p.click('#cefotAvisosOk').catch(()=>{}); await p.waitForTimeout(800);
    await paso('#tabBtnSanciones', 'Pestaña «Sanciones»', 'Para poner tú mismo una sanción (sin que te llegue de un jefe de pelotón), abre la pestaña <b>Sanciones</b>.', {margen:6});
    await p.click('#tabBtnSanciones'); await p.waitForTimeout(900);
    await paso('#sanModeIndividualBtn', 'Individual o múltiple', '<b>Individual</b> para un alumno; <b>Múltiple</b> para varios en el mismo expediente (hasta 25).', {margen:6});
    await paso('#sanCadeteInput', 'Alumno', 'Escribe el número, apellidos o nombre del alumno y <b>selecciónalo de la lista</b>. Sus datos se rellenan solos.');
    await p.fill('#sanCadeteInput','33010'); await p.keyboard.press('Tab'); await p.waitForTimeout(600);
    await paso('#sanFecha', 'Día, lugar y hora', 'Rellena el <b>día</b>, el <b>lugar</b> y la <b>hora</b>. Opcional: marca «Vincular a un expediente ya cursado» para añadir la falta a un expediente existente.');
    await p.fill('#sanFecha', mas(0)); await p.fill('#sanLugar','Galería de tiro (ficticia)'); await p.fill('#sanHora','10:15');
    await paso('#sanTipoFalta', 'Tipo de falta', 'Elige <b>Leve</b> o <b>Grave</b> y, si quieres, la <b>fase</b> (FFMG o FFE).');
    await p.selectOption('#sanTipoFalta','LEVE'); await p.waitForTimeout(300);
    await paso('#sanEmpleo', 'Profesor que da el parte', 'Empleo, nombre, apellidos y DNI de quien da el parte.');
    await p.selectOption('#sanEmpleo',{index:3}); await p.fill('#sanProfNombreInput','Demo'); await p.fill('#sanProfApellidosInput','Ejemplo Pruebas');
    await paso('#sanFundamento', 'Fundamento legal', 'Elige el <b>fundamento legal</b> de la lista.');
    await p.selectOption('#sanFundamento',{index:6});
    await paso('#sanMotivoInput', 'Motivo', 'Describe los hechos.');
    await p.fill('#sanMotivoInput','No respeta las normas de seguridad en la línea de tiro (hecho ficticio).');
    await paso('#sanMedidaInput', 'Medida correctora', 'Elige la medida. En este ejemplo, <b>Arresto</b>.');
    await p.selectOption('#sanMedidaInput','Arresto'); await p.waitForTimeout(400);
    await paso('#sanArrestoModoToggle', 'Fechas del arresto', '<b>Fecha conocida</b>: indica inicio y fin (los días se calculan solos). <b>Pendiente</b>: se guarda sin fecha y se fija después en el listado. <b>Un arresto que pones tú llega directamente al capitán.</b>', {margen:6});
    await p.fill('#sanArrestoFechaIni', mas(2)); await p.fill('#sanArrestoFechaFin', mas(3)); await p.waitForTimeout(300);
    await paso('#sanSaveBtn', 'Guarda la sanción', 'Pulsa <b>Guardar sanción</b>.');
    await p.click('#sanSaveBtn'); await p.waitForTimeout(1200);
    await paso('#firmaPrevioCanvas', 'Firma del alumno', 'Pasa el dispositivo al alumno para que <b>firme</b> (con el dedo o con el ratón).', {margen:2});
    await firmar('#firmaPrevioCanvas');
    await paso('#firmaPrevioSiguienteBtn', 'Confirma', 'Pulsa <b>Firmar y guardar</b>.');
    await p.click('#firmaPrevioSiguienteBtn'); await p.waitForTimeout(2500);
    await p.evaluate(()=>{ const e=document.getElementById('sanStatRow'); window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - 10); }); await p.waitForTimeout(600);
    await paso('#sancionesTableBody tr:first-child .status-pill.programado:has-text("capitán")', 'Sanción registrada', 'Aparece en el listado. Como es un arresto, lleva la etiqueta <b>«Enviado al capitán»</b>, que cambiará a «Tramitado por el capitán» cuando él le dé curso.', {margen:6});
    await paso(null, 'Fin', '¡Hecho! Desde el listado puedes consultar, generar documentos o eliminar el expediente.');
    await ctx.close();
  }

  fs.writeFileSync(`${OUT}/demos.json`, JSON.stringify(demos, null, 1));
  await b.close();
})();
