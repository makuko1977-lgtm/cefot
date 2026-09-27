// Captura los pasos de las demostraciones del manual interactivo.
// Para cada paso guarda: la imagen de la pantalla ANTES de la acción y el
// recuadro (en % de la pantalla) del elemento que hay que pulsar.
//
// Uso:  NODE_PATH=$(npm root -g) node capturar.js <carpeta>
//       SOLO=seccion_rebajes,capitan_entrar node capturar.js <carpeta>   (solo esas;
//       el resto se conserva del demos.json que ya haya en la carpeta)
//
// Las demostraciones se ejecutan en el orden de la lista DEMOS, porque unas
// preparan datos para otras (p. ej. el arresto pendiente que se ratifica en
// «seccion_revisar» es el que se fecha en «seccion_fijar_fecha» y el que
// tramita el capitán). Para una grabación completa: servidor con --reset.
const { chromium } = require('playwright'); const fs = require('fs');
const OUT = process.argv[2] || 'manual-interactivo-build';
const BASE = process.env.BASE || 'http://localhost:3000';
const SOLO = (process.env.SOLO || '').split(',').map(s=>s.trim()).filter(Boolean);
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, {recursive:true});
const hoy = new Date();
const mas = n=>{ const d=new Date(hoy); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
const DEMOS = [];
function demo(nombre, movil, fn){ DEMOS.push({ nombre, movil, fn }); }

// ---------------------------------------------------------------------------
// Utilidades comunes
// ---------------------------------------------------------------------------
async function entrar(p, usuario, pausa){
  await p.goto(BASE + '/login.html'); await p.waitForTimeout(600);
  await p.fill('#dni, input[type=text]', usuario); await p.fill('input[type=password]', 'demo1234');
  await p.click('button[type=submit], button:has-text("Entrar")'); await p.waitForTimeout(pausa || 2800);
}
// Retira la franja de avisos de partes de pelotón (igual que «Marcar todos como vistos»).
async function sinAvisos(p){
  if (await p.locator('#cefotAvisosOk').count()){ await p.click('#cefotAvisosOk'); await p.waitForTimeout(900); }
  await p.evaluate(()=>{ const b = document.getElementById('cefot-avisos'); if (b) b.remove(); });
}
async function arriba(p){ await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(250); }
async function verDesde(p, sel, margen){
  await p.evaluate(([s,m])=>{ const e=document.querySelector(s); if (e) window.scrollTo(0, e.getBoundingClientRect().top + window.scrollY - (m||10)); }, [sel, margen]);
  await p.waitForTimeout(400);
}
async function api(p, metodo, url, cuerpo){
  return p.evaluate(async ([m,u,c])=>{
    const r = await fetch(u, { method:m, headers:{'Content-Type':'application/json'}, body: c ? JSON.stringify(c) : undefined });
    return r.json().catch(()=>({}));
  }, [metodo, url, cuerpo]);
}
// Foto ficticia: silueta genérica dibujada (no es una persona real).
async function fotoFicticia(b){
  const pg = await b.newPage({viewport:{width:360,height:360}});
  await pg.setContent(`<body style="margin:0"><svg width="360" height="360" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="360" fill="#cfd8c0"/><circle cx="180" cy="140" r="70" fill="#6f7d5e"/>
    <path d="M50 360c10-90 70-130 130-130s120 40 130 130z" fill="#6f7d5e"/>
    <text x="180" y="342" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#fff">FICTICIO</text></svg></body>`);
  const buf = await pg.screenshot({type:'jpeg', quality:80}); await pg.close(); return buf;
}
// PDF mínimo de una página con un texto (adjunto ficticio).
function pdfFicticio(texto){
  const cont = `BT /F1 18 Tf 60 760 Td (${texto}) Tj ET`;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${cont.length} >>\nstream\n${cont}\nendstream`];
  let s = '%PDF-1.4\n'; const off = [];
  objs.forEach((o,i)=>{ off.push(s.length); s += `${i+1} 0 obj\n${o}\nendobj\n`; });
  const x = s.length; s += `xref\n0 ${objs.length+1}\n0000000000 65535 f \n` + off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('');
  s += `trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF`;
  return Buffer.from(s, 'latin1');
}

// ===========================================================================
//  JEFE DE PELOTÓN
// ===========================================================================
demo('peloton_parte', true, async ({ p, paso, firmar })=>{
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
  await paso('#firmaPrevioSiguienteBtn', 'Confirma la firma', 'Pulsa <b>Firmar y guardar</b>. En un parte múltiple aparece <b>Firmar y siguiente</b> y firma cada alumno por turno.');
  await p.click('#firmaPrevioSiguienteBtn'); await p.waitForTimeout(2500);
  await paso('button:has-text("Registrar otra sanción")', 'Parte registrado', 'Aparece el resumen con el <b>número de expediente</b>. El parte ya le ha llegado a tu jefe de sección. Pulsa <b>Registrar otra sanción</b> para empezar otro.');
  await paso(null, 'Fin', '¡Hecho! Tu jefe de sección revisará la medida que has propuesto.');
});

demo('peloton_multiple', true, async ({ p, paso, firmar })=>{
  await entrar(p, 'PELOTON1');
  await paso('#modeMultipleBtn', 'Parte para varios alumnos', 'Cuando la misma falta la cometen varios alumnos, pulsa <b>Múltiple</b>: todos quedan en el <b>mismo expediente</b> (hasta 25).', {margen:6});
  await p.click('#modeMultipleBtn'); await p.waitForTimeout(400);
  await paso('#multiSearch', 'Busca a los alumnos', 'Escribe el número, apellido o nombre del primer alumno.');
  await p.fill('#multiSearch','33014'); await p.waitForTimeout(900);
  await paso('#multiResults .multi-list-item', 'Márcalo en la lista', '<b>Marca la casilla</b> del alumno. Aparece debajo como etiqueta.');
  await p.locator('#multiResults input[type=checkbox]').first().check(); await p.waitForTimeout(400);
  await p.fill('#multiSearch','33015'); await p.waitForTimeout(900);
  await paso('#multiResults .multi-list-item', 'Añade los demás', 'Busca al siguiente y márcalo también. Repite con todos los implicados.');
  await p.locator('#multiResults input[type=checkbox]').first().check(); await p.waitForTimeout(400);
  await paso('#multiChips', 'Alumnos del parte', 'Cada alumno elegido aparece como etiqueta. Con la <b>✕</b> lo quitas si te has equivocado.', {margen:6});
  await p.fill('#sanFecha', mas(0)); await p.fill('#sanLugar','Aula 2 (ficticia)'); await p.fill('#sanHora','11:40');
  await p.selectOption('#sanTipoFalta','LEVE'); await p.waitForTimeout(300);
  await p.selectOption('#sanEmpleo',{index:3}); await p.fill('#sanProfNombreInput','Demo'); await p.fill('#sanProfApellidosInput','Uno');
  await p.selectOption('#sanFundamento',{index:3});
  await p.fill('#sanMotivoInput','Hablan durante la exposición del profesor (hecho ficticio).');
  await paso('#sanFecha', 'Datos del parte', 'Rellena el resto igual que en un parte individual: día, lugar, hora, tipo de falta, profesor, fundamento y motivo. <b>Los datos valen para todos.</b>');
  await paso('#sanMedidaInput', 'Medida que propones', 'Elige la medida para el grupo. En este ejemplo, <b>Refuerzo</b>.');
  await p.selectOption('#sanMedidaInput','Refuerzo'); await p.waitForTimeout(300);
  await paso('#sanSaveBtn', 'Guarda el parte', 'Pulsa <b>Guardar sanción</b>.');
  await p.click('#sanSaveBtn'); await p.waitForTimeout(1200);
  await paso('#firmaPrevioCanvas', 'Firma el primer alumno', 'Arriba se indica <b>qué alumno debe firmar</b> (1 de 2). Pásale el móvil para que firme con el dedo.', {margen:2});
  await firmar('#firmaPrevioCanvas');
  await paso('#firmaPrevioSiguienteBtn', 'Firmar y siguiente', 'Pulsa <b>Firmar y siguiente</b>: pasa al siguiente alumno.');
  await p.click('#firmaPrevioSiguienteBtn'); await p.waitForTimeout(900);
  await paso('#firmaPrevioCanvas', 'Firma el segundo alumno', 'Ahora firma el <b>segundo alumno</b> (2 de 2).', {margen:2});
  await firmar('#firmaPrevioCanvas');
  await paso('#firmaPrevioSiguienteBtn', 'Último alumno', 'Con la última firma el botón es <b>Firmar y guardar</b>. Sin la firma de todos no se guarda el parte.');
  await p.click('#firmaPrevioSiguienteBtn'); await p.waitForTimeout(2500);
  await paso('button:has-text("Registrar otra sanción")', 'Parte registrado', 'Un solo expediente con los dos alumnos. Ya le ha llegado a tu jefe de sección.');
  await paso(null, 'Fin', '¡Hecho! El jefe de sección revisará la medida propuesta para el grupo.');
});

demo('peloton_ficha', true, async ({ p, paso, recursos })=>{
  await entrar(p, 'PELOTON1');
  await paso('#tabBtnFicha', 'Pestaña «Ficha del alumno»', 'Solo la ves si tu jefe de sección te ha dado permiso (<b>Ver ficha básica</b>, <b>Hacer foto</b> o <b>Adjuntar archivos</b>).', {margen:6});
  await p.click('#tabBtnFicha'); await p.waitForTimeout(600);
  await paso('#fichaInstrInput', 'Busca al alumno', 'Escribe su número, apellido o nombre.');
  await p.fill('#fichaInstrInput','33016'); await p.waitForTimeout(900);
  await paso('#fichaInstrResults [data-numero]', 'Púlsalo en la lista', '<b>Pulsa el nombre</b> para abrir su ficha.');
  await p.locator('#fichaInstrResults [data-numero]').first().click(); await p.waitForTimeout(1200);
  await paso('#fichaInstrFieldsGrid', 'Datos básicos', 'Con el permiso <b>Ver ficha básica</b> ves sexo, DNI, teléfono y unidad. Son de solo lectura.', {margen:6});
  await paso('#fichaInstrUploadPhotoBtn', 'Foto del alumno', '<b>Hacer foto</b> abre la cámara del móvil; <b>Subir foto</b> usa una imagen ya guardada. En este ejemplo, <b>Subir foto</b>.');
  await p.setInputFiles('#fichaInstrUploadPhotoInput', { name:'foto_ficticia.jpg', mimeType:'image/jpeg', buffer: recursos.foto });
  await p.waitForTimeout(1800);
  await paso('#fichaInstrFotoCol', 'Foto guardada', 'La foto queda en la ficha y la ven también el jefe de sección y el capitán. <b>Quitar foto</b> la elimina.', {margen:6});
  await paso('#fichaInstrAttachAddBtn', 'Adjuntar archivos', 'Con el permiso <b>Adjuntar archivos</b> puedes añadir PDF o imágenes a la ficha (por ejemplo, un justificante).');
  await p.setInputFiles('#fichaInstrAttachInput', { name:'justificante_ficticio.pdf', mimeType:'application/pdf', buffer: recursos.pdf });
  await p.waitForTimeout(1800);
  await paso('#fichaInstrAttachList', 'Archivo adjuntado', 'El archivo aparece en la lista. <b>Descargar</b> lo abre; <b>Eliminar</b> solo aparece en los archivos que has subido tú.', {margen:6});
  await paso(null, 'Fin', '¡Hecho! Si te retiran un permiso, la función deja de estar disponible al momento.');
});

// ===========================================================================
//  JEFE DE SECCIÓN
// ===========================================================================
demo('seccion_revisar', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33', 3200);
  await paso('#cefot-avisos', 'Partes de pelotón pendientes', 'Al entrar, arriba aparece una <b>franja amarilla</b> con cada parte que han dado de alta tus jefes de pelotón: expediente, alumno, medida propuesta y quién lo puso.', {margen:2});
  const fila = '.cefot-aviso-row:has-text("33007")';
  await paso(fila, 'Elige el parte', 'Cada parte es una línea. En este ejemplo, el alumno 33007 llega <b>sin medida</b>.', {margen:4});
  await paso(fila + ' select.cefot-medida', 'Revisa la medida', 'En el desplegable puedes <b>dejar</b> la medida propuesta o <b>cambiarla</b>. Aquí se cambia a <b>Arresto</b>.');
  await p.selectOption(fila + ' select.cefot-medida', 'Arresto'); await p.waitForTimeout(400);
  await paso(fila + ' .cefot-extra-arresto', 'Fechas del arresto', 'Si ya sabes las fechas, desmarca <b>Fecha pendiente de fijar</b> y escríbelas. Si no, déjala marcada: la fijarás después en el listado. El aviso recuerda que <b>se enviará al capitán</b>.', {margen:4});
  await paso(fila + ' .cefot-guardar-medida', 'Guardar medida', 'Pulsa <b>Guardar medida</b>: la medida queda fijada en el parte y el aviso de ese parte se retira.');
  await p.click(fila + ' .cefot-guardar-medida'); await p.waitForTimeout(1200);
  await paso('#cefotAvisosOk', 'Marcar todos como vistos', 'Retira los demás avisos <b>sin cambiar</b> sus medidas. Los partes con <b>arresto</b> propuesto no se retiran así: hay que validarlos con <b>Guardar medida</b>.');
  await p.click('#cefotAvisosOk'); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ const b = document.getElementById('cefot-avisos'); if (b) b.remove(); });
  await p.click('#tabBtnSanciones'); await p.waitForTimeout(900);
  await p.fill('#sanSearchInput', '33007'); await p.waitForTimeout(700);
  await verDesde(p, '#sanStatRow');
  await paso('#sancionesTableBody tr:first-child td:nth-child(8)', 'Resultado en el listado', 'En <b>Sanciones</b> el parte ya figura con la medida <b>Arresto · Pendiente</b> y la etiqueta <b>Enviado al capitán</b>.', {margen:4});
  await paso(null, 'Fin', '¡Hecho! Si hubieras dejado otra medida (amonestación, trabajo, refuerzo…) seguirías con ella desde el listado de Sanciones.');
});

demo('seccion_sancion', false, async ({ p, paso, firmar })=>{
  await p.goto(BASE + '/login.html'); await p.waitForTimeout(800);
  await p.fill('#dni, input[type=text]','JEFE33'); await p.fill('input[type=password]','demo1234');
  await paso('button[type=submit], button:has-text("Entrar")', 'Entra en la aplicación', 'Escribe tu <b>usuario</b> y tu <b>contraseña</b> y pulsa <b>Entrar</b>.');
  await p.click('button[type=submit], button:has-text("Entrar")'); await p.waitForTimeout(3000);
  await sinAvisos(p);
  await paso('#tabBtnSanciones', 'Pestaña «Sanciones»', 'Para poner tú mismo una sanción (sin que te llegue de un jefe de pelotón), abre la pestaña <b>Sanciones</b>.', {margen:6});
  await p.click('#tabBtnSanciones'); await p.waitForTimeout(900);
  await paso('#sanModeIndividualBtn', 'Individual o múltiple', '<b>Individual</b> para un alumno; <b>Múltiple</b> para varios en el mismo expediente (hasta 25).', {margen:6});
  await paso('#sanCadeteInput', 'Alumno', 'Escribe el número, apellidos o nombre del alumno y <b>selecciónalo de la lista</b>. Sus datos se rellenan solos.');
  await p.fill('#sanCadeteInput','33018'); await p.keyboard.press('Tab'); await p.waitForTimeout(600);
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
  await verDesde(p, '#sanStatRow');
  await paso('#sancionesTableBody tr:first-child .status-pill.programado:has-text("capitán")', 'Sanción registrada', 'Aparece en el listado. Como es un arresto, lleva la etiqueta <b>«Enviado al capitán»</b>, que cambiará a «Tramitado por el capitán» cuando él le dé curso.', {margen:6});
  await paso(null, 'Fin', '¡Hecho! Desde el listado puedes consultar, generar documentos o eliminar el expediente.');
});

demo('seccion_fijar_fecha', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  await paso('#tabBtnSanciones', 'Pestaña «Sanciones»', 'Los arrestos guardados con fecha <b>Pendiente</b> se fechan desde el listado de Sanciones.', {margen:6});
  await p.click('#tabBtnSanciones'); await p.waitForTimeout(900);
  await paso('#sanSearchInput', 'Localiza el expediente', 'Escribe en el buscador el número del alumno, su apellido o el expediente. En el ejemplo, <b>33007</b>.');
  await p.fill('#sanSearchInput', '33007'); await p.waitForTimeout(700);
  const f = '#sancionesTableBody tr:first-child .arresto-pendiente-form';
  await paso(f + ' .arr-fecha-ini', 'Fecha de inicio', 'En la columna <b>Medida correctora</b> el arresto aparece como <b>Pendiente</b>, con dos casillas de fecha. Escribe la de <b>inicio</b>…');
  await p.fill(f + ' .arr-fecha-ini', mas(4));
  await paso(f + ' .arr-fecha-fin', 'Fecha de fin', '…y la de <b>fin</b> (igual o posterior a la de inicio).');
  await p.fill(f + ' .arr-fecha-fin', mas(5));
  await paso(f + ' .arr-guardar-btn', 'Fijar fecha', 'Pulsa <b>Fijar fecha</b>. Si el alumno ya tiene otro arresto o refuerzo esos días, la aplicación te avisa de la coincidencia.');
  await p.click(f + ' .arr-guardar-btn'); await p.waitForTimeout(1500);
  await p.fill('#sanSearchInput', '33007'); await p.waitForTimeout(700);
  await paso('#sancionesTableBody tr:first-child td:nth-child(8)', 'Arresto fechado', 'El arresto muestra ya sus fechas. Sigue con la etiqueta del capitán, que verá también las fechas.', {margen:4});
  await paso(null, 'Fin', '¡Hecho! En <b>Consultas → Sanciones de arresto con fecha pendiente</b> puedes ver los que aún faltan por fechar.');
});

demo('seccion_amonestacion', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  await p.click('#tabBtnSanciones'); await p.waitForTimeout(900);
  await paso('#sanSearchInput', 'Localiza la amonestación', 'En <b>Sanciones</b>, busca al alumno. En el ejemplo, el parte que dio el jefe de pelotón al <b>33012</b> con medida <b>Amonestación verbal</b>.');
  await p.fill('#sanSearchInput', '33012'); await p.waitForTimeout(700);
  const btn = '#sancionesTableBody tr:has-text("Amonestación verbal") [data-amonref]';
  await paso(btn, 'Botón «Documento»', 'Las amonestaciones verbales tienen el botón <b>Documento</b> (o <b>Generar documento</b> si el alumno aún no ha firmado).');
  await p.click(btn); await p.waitForTimeout(900);
  await paso('#firmaExistingWrap .firma-preview', 'Firma del alumno', 'Como el alumno firmó al dar de alta el parte, su <b>firma ya está guardada</b>. Si hiciera falta, <b>Firmar de nuevo</b> abre el recuadro de firma.', {margen:4});
  await paso('#firmaDescargarBtn', 'Descargar documento', 'Pulsa <b>Descargar documento</b>: se genera el PDF «Amonestaciones Verbales» con los datos del parte y la firma del alumno.');
  const [ dl ] = await Promise.all([ p.waitForEvent('download', {timeout:15000}).catch(()=>null), p.click('#firmaDescargarBtn') ]);
  if (dl) console.log('   descargado', dl.suggestedFilename()); else console.log('   ** sin descarga');
  await p.waitForTimeout(800);
  await paso(null, 'Fin', '¡Hecho! El PDF se guarda en la carpeta de descargas del equipo para imprimirlo o archivarlo.');
});

demo('seccion_roster', false, async ({ p, paso, recursos })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  await paso('#statRow', 'Roster de la sección', 'La pestaña <b>Roster</b> se abre al entrar. Los cuadros cuentan alumnos, pelotones, unidades y hombres/mujeres <b>de lo que esté filtrado</b>.', {margen:4});
  await paso('#searchInput', 'Buscar', 'Busca por nombre, apellidos, número o DNI.');
  await paso('#pelotonFilter', 'Filtrar por pelotón', 'Filtra por <b>pelotón</b> o por <b>unidad</b>. En el ejemplo, el pelotón 1.');
  await p.selectOption('#pelotonFilter', '1'); await p.waitForTimeout(500);
  await paso('#rosterAdvToggle', 'Filtros avanzados', 'Añade filtros por <b>sexo</b> y por <b>situación</b> (con rebaje vigente, sin rebaje vigente o con sanción). Todos los filtros se cumplen a la vez.');
  await p.click('#rosterAdvToggle'); await p.waitForTimeout(400);
  await paso('#rosterAdvPanel', 'Sexo y situación', 'Elige lo que necesites. <b>Limpiar filtros</b> los quita todos.', {margen:4});
  await p.click('#rosterClearFilters'); await p.waitForTimeout(300);
  await p.click('#rosterAdvToggle').catch(()=>{}); await p.waitForTimeout(300);
  await p.fill('#searchInput', '33004'); await p.waitForTimeout(600);
  await paso('#tableBody [data-ficha]', 'Ficha del alumno', 'En cada alumno: <b>Ficha</b>, <b>Historial</b> y <b>Baja</b>. Pulsa <b>Ficha</b>.');
  await p.click('#tableBody [data-ficha]'); await p.waitForTimeout(1000);
  await paso('#fichaUploadPhotoBtn', 'Foto', '<b>Hacer foto</b> usa la cámara del equipo; <b>Subir foto</b>, una imagen guardada. En el ejemplo, <b>Subir foto</b>.');
  await p.setInputFiles('#fichaUploadPhotoInput', { name:'foto_ficticia.jpg', mimeType:'image/jpeg', buffer: recursos.foto }); await p.waitForTimeout(1500);
  await paso('#fichaFieldsGrid', 'Datos del alumno', 'Sus datos del roster. Si corriges alguno, pulsa <b>Guardar cambios</b> al final de la ficha.', {margen:4});
  await paso('#fichaSummary', 'Resumen', 'Resumen de sus <b>rebajes, sanciones y refuerzos</b>, con la alerta por reincidencia si la hay. Este alumno tiene un rebaje total vigente.', {margen:4});
  await paso('#fichaAttachAddBtn', 'Adjuntos', '<b>Añadir archivo…</b> guarda PDF o imágenes en su ficha. <b>Generar PDF</b> saca la ficha en PDF.');
  await p.click('#fichaCloseBtn'); await p.waitForTimeout(500);
  await p.fill('#searchInput', '33018'); await p.waitForTimeout(600);
  await paso('#tableBody [data-historial]', 'Historial', 'Pulsa <b>Historial</b> para ver todo lo registrado del alumno.');
  await p.click('#tableBody [data-historial]'); await p.waitForTimeout(1000);
  await paso('#historialBody', 'Historial completo', 'Todos sus <b>rebajes, sanciones y refuerzos</b>, con fechas, motivos y medidas. Este alumno acumula varios arrestos.', {margen:4});
  await p.click('#historialCloseBtn'); await p.waitForTimeout(400);
  await paso('#tableBody [data-baja]', 'Dar de baja', '<b>Baja</b> pasa al alumno a la lista de bajas <b>sin borrar nada</b>. Desde <b>Bajas</b> se puede <b>Reincorporar</b> tal como estaba.');
  await paso(null, 'Fin', '¡Hecho! <b>Importar fotos…</b> carga varias fotos a la vez (el nombre del archivo es el número del alumno, p. ej. 33001.jpg).');
});

demo('seccion_rebajes', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  await paso('#tabBtnRebajes', 'Pestaña «Rebajes»', 'Abre la pestaña <b>Rebajes</b>.', {margen:6});
  await p.click('#tabBtnRebajes'); await p.waitForTimeout(800);
  await paso('#rebCadeteInput', 'Alumno', 'Escribe el número, apellidos o nombre y <b>elígelo de la lista</b>; sus datos se rellenan solos.');
  await p.fill('#rebCadeteInput', '33020'); await p.keyboard.press('Tab'); await p.waitForTimeout(600);
  await paso('#rebFechaInicio', 'Fechas', 'Indica la <b>fecha de inicio</b> y la <b>de fin</b> (no puede ser anterior a la de inicio).');
  await p.fill('#rebFechaInicio', mas(0)); await p.fill('#rebFechaFin', mas(6)); await p.waitForTimeout(300);
  await paso('#rebTotalSwitch', 'Rebaje total / clase', 'Si el rebaje es <b>total</b>, activa este interruptor: exime de todas las actividades y las marca solas.', {margen:6});
  await paso('#rebCategoryGrid [data-cat-switch]', 'Actividades de las que queda exento', 'Si es parcial, <b>activa cada actividad</b> de la que queda exento. En el ejemplo, las dos primeras.', {margen:6});
  const sw = p.locator('#rebCategoryGrid [data-cat-switch]');
  await sw.nth(0).click(); await sw.nth(1).click(); await p.waitForTimeout(300);
  await paso('#rebSaveBtn', 'Guardar rebaje', 'Pulsa <b>Guardar rebaje</b>. <b>Limpiar formulario</b> lo vacía.');
  await p.click('#rebSaveBtn'); await p.waitForTimeout(1500);
  await verDesde(p, '#rebStatRow');
  await paso('#rebajesTableBody tr:has-text("33020")', 'Listado de rebajes', 'El rebaje aparece en el listado con su <b>estado</b> (vigente, programado o finalizado). Se puede buscar, filtrar por pelotón y estado, y <b>Eliminar</b>.', {margen:3});
  await paso(null, 'Fin', '¡Hecho! Los jefes de pelotón con permiso ven los rebajes vigentes desde su móvil.');
});

demo('seccion_refuerzos', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  await paso('#tabBtnSanciones', 'Desde una sanción con refuerzo', 'Cuando una sanción tiene la medida <b>Refuerzo</b>, el refuerzo se prepara desde el listado de <b>Sanciones</b>.', {margen:6});
  await p.click('#tabBtnSanciones'); await p.waitForTimeout(900);
  await p.fill('#sanSearchInput', '33005'); await p.waitForTimeout(700);
  await verDesde(p, '#sanStatRow');
  await paso('#sancionesTableBody [data-genref]', 'Generar refuerzo', 'Pulsa <b>Generar refuerzo</b> en el expediente.');
  await p.click('#sancionesTableBody [data-genref]'); await p.waitForTimeout(700);
  await paso('#generarRefuerzoSaveBtn', 'Confirma', 'Se abrirá la pestaña Refuerzos con los datos del parte ya rellenados. Pulsa <b>Guardar y refuerzo</b>.');
  await p.click('#generarRefuerzoSaveBtn'); await p.waitForTimeout(1200);
  await arriba(p);
  await paso('#refDraftBanner', 'Datos traídos de la sanción', 'La franja indica el expediente de origen. Los alumnos, el profesor, el fundamento y el motivo <b>ya están rellenos</b>.', {margen:4});
  await paso('#refFechaInicio', 'Fechas del refuerzo', 'Indica la <b>fecha de inicio</b> y la <b>de fin</b> del refuerzo.');
  await p.fill('#refFechaInicio', mas(1)); await p.fill('#refFechaFin', mas(2)); await p.waitForTimeout(300);
  await paso('#refTipo', 'Tipo, hora y duración', 'Elige el <b>tipo</b> (IFM, estudio o entreno), la <b>hora de inicio</b> y la <b>duración</b> en horas. Si el periodo incluye sábado o domingo, se pide su horario aparte.');
  await p.selectOption('#refTipo', 'ESTUDIO'); await p.fill('#refHoraInicio', '18:00'); await p.fill('#refDuracion', '1');
  await paso('#refAudDia', 'Datos del documento', 'Para el documento (ANEXO): <b>trámite de audiencia</b> (día y hora), <b>jefe de compañía</b> que firma la resolución y <b>lugar y fecha</b>.');
  await p.fill('#refAudDia', mas(0)); await p.fill('#refAudHora', '12:00'); await p.fill('#refJefeCia', 'Capitán Ficticio Supuesto');
  await p.fill('#refLugarFecha', 'San Fernando, a ' + new Date().toLocaleDateString('es-ES'));
  await paso('#refSaveBtn', 'Guardar refuerzo', 'Pulsa <b>Guardar refuerzo</b>. Si coincide con otro arresto o refuerzo del alumno, la aplicación lo avisa.');
  await p.click('#refSaveBtn'); await p.waitForTimeout(1800);
  await verDesde(p, '#refStatRow');
  await paso('#refuerzosTableBody [data-pdfref]', 'Rellenar documento', 'El refuerzo aparece en el listado, un registro por alumno, con su <b>expediente de origen</b>. <b>Rellenar documento</b> genera el ANEXO; <b>Eliminar</b> lo borra.');
  await paso(null, 'Fin', '¡Hecho! Para un refuerzo voluntario, rellena el formulario de la pestaña <b>Refuerzos</b> directamente.');
});

demo('seccion_actividades', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  await paso('#tabBtnActividades', 'Pestaña «Actividades»', 'Registra quién ha participado en cada marcha, tiro, examen o conferencia del ciclo.', {margen:6});
  await p.click('#tabBtnActividades'); await p.waitForTimeout(900);
  await paso('#actFaseToggle', 'Elige la fase', 'Cada fase (<b>FFMG</b> o <b>FFE</b>) tiene sus propias actividades. La primera vez se carga un catálogo estándar, que puedes modificar. En el ejemplo, <b>FFMG</b>.', {margen:6});
  await p.click('#actFaseFFMGBtn'); await p.waitForTimeout(1000);
  await paso('#actNombreInput', 'Nueva actividad', 'Para añadir una actividad, escribe su <b>nombre</b> y, si quieres, la <b>fecha</b>.');
  await p.fill('#actNombreInput', 'MARCHA NOCTURNA 8 KM (FICTICIA)'); await p.fill('#actFechaInput', mas(-1));
  await paso('#actAddBtn', 'Añadir actividad', 'Pulsa <b>Añadir actividad</b>. Aparece en la tabla.');
  await p.click('#actAddBtn'); await p.waitForTimeout(1000);
  const fila = '#actividadesTableBody tr:has-text("MARCHA NOCTURNA")';
  await paso(fila + ' [data-actpart]', 'Participantes', 'Pulsa el botón <b>N participantes</b> de la actividad.');
  await p.click(fila + ' [data-actpart]'); await p.waitForTimeout(800);
  await paso('#actSeleccionarTodos', 'Marca a los que participaron', 'Marca uno a uno a los alumnos que han participado, o <b>Seleccionar todos</b> y desmarca a los que faltaron. El buscador ayuda a encontrarlos.', {margen:4});
  await p.check('#actSeleccionarTodos'); await p.waitForTimeout(300);
  const items = p.locator('#actParticipantesList input[type=checkbox]');
  await items.nth(2).uncheck(); await items.nth(7).uncheck(); await p.waitForTimeout(300);
  await paso('#actParticipantesGuardarBtn', 'Guardar', 'Abajo se ve cuántos hay marcados. Pulsa <b>Guardar</b>.');
  await p.click('#actParticipantesGuardarBtn'); await p.waitForTimeout(1000);
  await paso(fila, 'Actividad registrada', 'El botón muestra ya el número de participantes. La fecha se puede cambiar en la misma tabla.', {margen:3});
  await paso(null, 'Fin', '¡Hecho! En <b>Consultas → Personal que ha participado en una actividad</b> puedes sacar quién fue (o quién no).');
});

demo('seccion_consultas', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  await paso('#tabBtnConsultas', 'Pestaña «Consultas»', 'Listados listos para imprimir.', {margen:6});
  await p.click('#tabBtnConsultas'); await p.waitForTimeout(800);
  await paso('#consTipoSelect', 'Tipo de consulta', 'Elige qué quieres consultar: personal rebajado, en refuerzo o en arresto en un periodo; participantes en una actividad; arrestos con fecha pendiente; trabajos; o un expediente completo. En el ejemplo, la primera.');
  await p.selectOption('#consTipoSelect', 'estado_periodo'); await p.waitForTimeout(400);
  await paso('#consFechasWrap', 'Periodo', 'Indica la <b>fecha de inicio</b> y la <b>de fin</b> de la consulta.', {margen:4});
  await p.fill('#consFechaIni', mas(0)); await p.fill('#consFechaFin', mas(7)); await p.waitForTimeout(300);
  await paso('#consBuscarBtn', 'Consultar', 'Pulsa <b>Consultar</b>.');
  await p.click('#consBuscarBtn'); await p.waitForTimeout(1200);
  await verDesde(p, '#consResultadosWrap');
  await paso('#consResultados', 'Resultado', 'Tres listas: <b>rebajados</b>, <b>en refuerzo</b> y <b>arrestados</b> en esas fechas.', {margen:2});
  await arriba(p);
  await paso('#consImprimirBtn', 'Imprimir', '<b>Imprimir</b> saca el resultado en papel o en PDF (según la impresora que elijas).');
  await paso(null, 'Fin', '¡Hecho! En <b>Consulta de expediente</b>, «4» y «004» son el mismo número.');
});

demo('seccion_horasua', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  const A = '#cefot2-horas-ua-app ';
  await paso('#tabBtnHorasUa', 'Pestaña «Horas UA»', 'Control de las horas impartidas por <b>unidad de aprendizaje</b>.', {margen:6});
  await p.click('#tabBtnHorasUa'); await p.waitForTimeout(1200);
  await paso(A + '.alarma', 'Alarma', 'Indica cuántas horas de la fase y del módulo <b>siguen sin fecha</b>.', {margen:3});
  await paso(A + '.tabs', 'Fase', 'Elige la fase: <b>FFMG</b> o <b>FFE</b>.', {margen:3});
  await paso(A + '[data-act=menu]', 'Módulo', 'Pulsa aquí para elegir el <b>módulo</b>.');
  await p.click(A + '[data-act=menu]'); await p.waitForTimeout(500);
  await paso(A + '[data-act=mod][data-id="ffmg-fm-i"]', 'Elige el módulo', 'Cada módulo indica sus horas y cuántas faltan por fechar. En el ejemplo, <b>FM-I</b>.');
  await p.click(A + '[data-act=mod][data-id="ffmg-fm-i"]'); await p.waitForTimeout(700);
  const ua = 'ffmg-fm-i-ud1-fmg-1-1';
  await paso(A + `[data-act=ua][data-id="${ua}"]`, 'Unidad de aprendizaje', 'Cada unidad se despliega al pulsarla y muestra sus horas <b>teóricas (T)</b> y <b>prácticas (P)</b>.');
  await paso(A + `[data-hueco="${ua}:T:1"]`, 'Fecha de cada hora', 'Cada hora tiene su casilla: escribe la <b>fecha en que se impartió</b>.');
  await paso(A + `[data-lote="${ua}"]`, 'Misma fecha para todas', 'Si todas se dieron el mismo día, escribe la fecha aquí…');
  await p.fill(A + `[data-lote="${ua}"]`, mas(-2)); await p.waitForTimeout(300);
  await paso(A + `[data-act=aplicar][data-id="${ua}"]`, 'Aplicar a pendientes', '…y pulsa <b>Aplicar a pendientes</b>: rellena todas las horas sin fecha de esa unidad.');
  await p.click(A + `[data-act=aplicar][data-id="${ua}"]`); await p.waitForTimeout(900);
  await arriba(p);
  await paso(A + '.alarma', 'La alarma se actualiza', 'El número de horas sin fecha baja al momento.', {margen:3});
  await paso(A + '.filt', 'Filtros y exportar', 'Filtra por <b>Pendientes</b>, <b>Impartidas</b> o <b>Todas</b>. <b>Exportar</b> descarga el estado; <b>Vaciar</b> borra las fechas.', {margen:4});
  await paso(null, 'Fin', '¡Hecho!');
});

demo('seccion_usuarios', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  await paso('#tabBtnUsuarios', 'Pestaña «Usuarios»', 'Aquí das de alta a tus <b>jefes de pelotón</b> y les das permisos.', {margen:6});
  await p.click('#tabBtnUsuarios'); await p.waitForTimeout(900);
  await paso('#userDniInput', 'Usuario', 'Escribe el <b>usuario</b> (DNI u otro identificador, sin espacios), el <b>nombre completo</b> y una <b>contraseña inicial</b> (mínimo 6 caracteres).');
  await p.fill('#userDniInput', 'PELOTON3'); await p.fill('#userNombreInput', 'Cabo Ejemplo Tres (ficticio)'); await p.fill('#userPasswordInput', 'demo1234');
  await paso('#userPermisosGrid', 'Permisos', 'Dar de alta partes lo puede hacer siempre. Marca los <b>permisos extra</b>: hacer foto, ver ficha básica, adjuntar archivos y ver rebajes/refuerzos.', {margen:6});
  await p.locator('#userPermisosGrid input[type=checkbox]').nth(1).check();
  await p.locator('#userPermisosGrid input[type=checkbox]').nth(3).check(); await p.waitForTimeout(300);
  await paso('#userCreateBtn', 'Crear usuario', 'Pulsa <b>Crear usuario</b>. Después comunícale la dirección, su usuario y su contraseña por un canal seguro.');
  await p.click('#userCreateBtn'); await p.waitForTimeout(1200);
  const fila = '#usuariosTableBody tr:has-text("PELOTON3")';
  await paso(fila, 'Usuario creado', 'Aparece en el listado con sus permisos.', {margen:3});
  await paso(fila + ' [data-editpermisos]', 'Editar permisos', 'Con <b>Editar permisos</b> los cambias cuando quieras: el cambio vale al momento.');
  await p.click(fila + ' [data-editpermisos]'); await p.waitForTimeout(700);
  await paso('#permisosModalGrid', 'Marca o desmarca', 'Marca o desmarca los permisos…', {margen:6});
  await p.locator('#permisosModalGrid input[type=checkbox]').nth(0).check(); await p.waitForTimeout(200);
  await paso('#permisosGuardarBtn', 'Guardar permisos', '…y pulsa <b>Guardar permisos</b>.');
  await p.click('#permisosGuardarBtn'); await p.waitForTimeout(1000);
  await p.click('#permisosCloseBtn').catch(()=>{}); await p.waitForTimeout(400);
  await paso(fila + ' [data-resetpw]', 'Contraseña y baja', 'Si olvida su contraseña, <b>Cambiar contraseña</b> le asigna una nueva. <b>Eliminar</b> le quita el acceso al momento.');
  await paso(null, 'Fin', '¡Hecho! Más abajo, <b>Cerrar curso…</b> vacía sanciones, rebajes y refuerzos para el curso siguiente (irreversible; pide descargar antes la copia).');
});

demo('seccion_exportar', false, async ({ p, paso })=>{
  await entrar(p, 'JEFE33'); await sinAvisos(p);
  await paso('#exportBackupBtn', 'Exportar copia', 'Para pasar los datos al <b>HTML local</b> de la intranet, pulsa <b>Exportar copia</b> (arriba a la derecha).');
  const [ dl ] = await Promise.all([ p.waitForEvent('download', {timeout:15000}), p.click('#exportBackupBtn') ]);
  const ruta = `${OUT}/_copia_servidor.json`; await dl.saveAs(ruta); await p.waitForTimeout(600);
  await paso('#exportBackupBtn', 'Archivo descargado', `Se descarga un archivo como <b>${dl.suggestedFilename()}</b> (compañía-sección y fecha). Llévalo al ordenador de la intranet. <b>Contiene datos personales</b>: guárdalo con la debida custodia.`);
  await p.goto('file://' + require('path').resolve(__dirname, '../../../../legado/seccion3.html')); await p.waitForTimeout(1500);
  await paso('#uploadImportServerBackupBtn', 'En el HTML local', 'Abre <b>seccion3.html</b> (doble clic) y pulsa <b>Importar copia del servidor (añadir)…</b>. Elige el archivo descargado.');
  let mensaje = '';
  p.removeAllListeners('dialog');
  p.on('dialog', x=>{ if (!mensaje) mensaje = x.message(); x.accept(); });
  const [ fc ] = await Promise.all([ p.waitForEvent('filechooser'), p.click('#uploadImportServerBackupBtn') ]);
  await fc.setFiles(ruta); await p.waitForTimeout(2500);
  await arriba(p);
  const lineas = mensaje.split('\n').filter(l=>/nuev/.test(l)).map(l=>l.replace(/\(.*\)/,'').trim());
  console.log('   confirmación:', lineas.join(' | '));
  await paso(null, 'Resumen y confirmación', 'Antes de importar, el navegador muestra un resumen de lo nuevo (en el ejemplo: ' + lineas.join('; ') + ') y de lo que ya existía. Al <b>Aceptar</b> solo se añade lo que falta: <b>nunca se sustituye ni se borra nada</b>.');
  await paso(null, 'Fin', '¡Hecho! Importar dos veces la misma copia no duplica nada. Si un registro ya importado se corrige después en el servidor, el cambio hay que hacerlo a mano en local.');
});

// ===========================================================================
//  CAPITÁN DE COMPAÑÍA
// ===========================================================================
demo('capitan_entrar', false, async ({ p, paso })=>{
  await p.goto(BASE + '/login.html'); await p.waitForTimeout(700);
  await p.fill('#dni, input[type=text]','CAPITAN3'); await p.fill('input[type=password]','demo1234');
  await paso('button[type=submit], button:has-text("Entrar")', 'Entra en la aplicación', 'Escribe tu usuario y tu contraseña y pulsa <b>Entrar</b>. Se abre la pantalla <b>Capitán de compañía</b>.');
  await p.click('button[type=submit], button:has-text("Entrar")'); await p.waitForTimeout(3000);
  if (await p.locator('#cap-arrestos').count()) await paso('#cap-arrestos', 'Arrestos pendientes', 'Si tienes arrestos por tramitar, aparecen arriba (lo verás en «Dar curso a un arresto»).', {margen:2});
  await p.evaluate(()=>{ const b = document.getElementById('cap-arrestos'); if (b) b.style.position='static'; });
  await verDesde(p, '#seccionesGrid', 20);
  await paso('#seccionesGrid', 'Secciones de mi compañía', 'Aparecen las cinco secciones. Las creadas muestran su jefe de sección, alumnos y sanciones; las apagadas aún no existen y no se puede entrar.', {margen:4, sinScroll:true});
  const btn = '#seccionesGrid .seccion-card:has-text("Sección 3") .entrar-btn';
  await paso(btn, 'Entrar en una sección', 'Pulsa <b>Entrar</b> en la sección que quieras. En el ejemplo, la 3ª.', {sinScroll:true});
  await p.click(btn); await p.waitForTimeout(3200);
  await p.evaluate(()=>{ const b = document.getElementById('cefot-avisos'); if (b) b.remove(); });
  await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(300);
  await paso('#capitanBanner', 'Modo capitán de compañía', 'Trabajas en la sección como su jefe de sección. El aviso lo recuerda (y cuántos arrestos tienes pendientes). <b>No aparecen</b> la pestaña Usuarios ni las opciones de cambiar el roster.', {margen:4});
  await paso('.tabbar', 'Mismas pestañas', 'Roster, rebajes, sanciones, refuerzos, actividades, consultas, notas y horas UA funcionan igual que para el jefe de sección, y él ve al momento lo que registres.', {margen:4});
  await paso('#capitanCambiarSeccionBtn', 'Volver a compañía', 'Para volver a tu pantalla sin cerrar la sesión, pulsa <b>Volver a compañía</b>. Desde ahí puedes entrar en otra sección.');
  await p.click('#capitanCambiarSeccionBtn'); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ const b = document.getElementById('cap-arrestos'); if (b) b.style.position='static'; });
  await verDesde(p, '#miPasswordInput', 60);
  await paso('#miPasswordSaveBtn', 'Mi contraseña', 'En tu pantalla, <b>Mi contraseña</b> te permite cambiarla: escríbela dos veces (mínimo 6 caracteres) y pulsa <b>Guardar contraseña</b>.', {sinScroll:true});
  await paso(null, 'Fin', '¡Hecho! No puedes entrar en secciones de otra compañía.');
});

demo('capitan_arresto', false, async ({ p, paso })=>{
  await entrar(p, 'CAPITAN3', 3000);
  await paso('#cap-arrestos', 'Arrestos para dar curso administrativo', 'Arriba aparecen los arrestos que te han enviado los jefes de sección: expediente, sección, alumno, motivo, fechas y quién lo envió.', {margen:2});
  const fila = '#cap-arrestos .arr-row:has-text("33018")';
  await paso(fila + ' .arr-linea', 'Alumno con antecedentes', 'La etiqueta <b>⚠ 1 alumno con antecedentes</b> avisa de que el alumno ya tiene sanciones o arrestos anteriores en su sección.', {margen:3});
  await paso(fila + ' .ver-datos', 'Ver datos', 'Pulsa <b>Ver datos</b> para ver todos los datos del parte.');
  await p.click(fila + ' .ver-datos'); await p.waitForTimeout(600);
  await paso(fila + ' .arr-detalle', 'Datos y antecedentes', 'Día, lugar, fundamento, motivo, profesor y fechas del arresto; y cada alumno con sus <b>antecedentes</b>: qué número de arresto es y cuántas sanciones anteriores tiene.', {margen:3});
  await paso(fila + ' .arr-detalle .ver-hist', 'Historial del alumno', '<b>Historial</b> abre su historial completo (el mismo que ve su jefe de sección).');
  await p.click(fila + ' .arr-detalle .ver-hist'); await p.waitForTimeout(1000);
  await paso('#histCuerpo', 'Historial', 'Sanciones, rebajes y refuerzos del alumno.', {margen:3});
  await p.click('#histCerrar'); await p.waitForTimeout(400);
  await paso(fila + ' .tramitar', 'Marcar como tramitado', 'Cuando le hayas dado curso, pulsa <b>Marcar como tramitado</b>. «Rellenar documentos» e «Imprimir» se activarán cuando se incorporen las plantillas.');
  await p.click(fila + ' .tramitar'); await p.waitForTimeout(1500);
  await paso(await p.locator('#cap-arrestos').count() ? '#cap-arrestos' : null, 'Sale de la ventana', 'El arresto desaparece de pendientes y pasa al <b>historial de arrestos</b>. En el listado del jefe de sección cambia a <b>Tramitado por el capitán</b>.', {margen:2});
  await paso(null, 'Fin', '¡Hecho!');
});

demo('capitan_protocolo', false, async ({ p, paso })=>{
  await entrar(p, 'CAPITAN3', 3000);
  await p.evaluate(()=>{ const b = document.getElementById('cap-arrestos'); if (b) b.style.position='static'; });
  await verDesde(p, '#consNumero', 80);
  await paso('#consNumero', 'Nº de protocolo', 'En <b>Consultar alumno por nº de protocolo</b>, escribe el número del alumno.', {sinScroll:true});
  await p.fill('#consNumero', '33018');
  await paso('#consBuscarBtn', 'Buscar', 'Pulsa <b>Buscar</b>. Solo encuentra alumnos de las secciones de tu compañía.', {sinScroll:true});
  await p.click('#consBuscarBtn'); await p.waitForTimeout(1200);
  await paso('#consResultado', 'Resultado', 'Aparece el alumno, su sección y cuántas sanciones y arrestos tiene.', {margen:3});
  await paso('#consResultado .ver-hist', 'Ver historial', 'Pulsa <b>Ver historial</b> para verlo completo.');
  await p.click('#consResultado .ver-hist'); await p.waitForTimeout(1000);
  await paso('#histCuerpo', 'Historial completo', 'Todas sus sanciones, rebajes y refuerzos.', {margen:3});
  await paso(null, 'Fin', '¡Hecho!');
});

demo('capitan_historial', false, async ({ p, paso })=>{
  await entrar(p, 'CAPITAN3', 3000);
  await p.evaluate(()=>{ const b = document.getElementById('cap-arrestos'); if (b) b.style.position='static'; });
  await verDesde(p, '#hTabla', 260);
  await paso('#hTabla', 'Historial de arrestos', 'Recoge <b>todos</b> los arrestos que te han llegado, pendientes y tramitados.', {margen:3, sinScroll:true});
  await paso('#hEstado', 'Filtros', 'Filtra por <b>sección</b>, <b>estado</b> y <b>fechas del parte</b>. En el ejemplo, solo los tramitados.', {sinScroll:true});
  await p.selectOption('#hEstado', 'tramitado'); await p.waitForTimeout(500);
  await paso('#hTexto', 'Buscar', 'Busca por alumno, nº de protocolo, expediente o motivo. En el ejemplo, <b>33018</b>.', {sinScroll:true});
  await p.fill('#hTexto', '33018'); await p.waitForTimeout(700);
  await paso('#hTabla', 'Resultado', 'Solo quedan los arrestos que cumplen todos los filtros. Debajo se indica cuántos son.', {margen:3, sinScroll:true});
  await paso('#hTabla .reabrir', 'Devolver a pendientes', 'Si marcaste uno como tramitado por error, <b>Devolver a pendientes</b> lo vuelve a poner en la ventana de arrestos.', {sinScroll:true});
  await paso(null, 'Fin', '¡Hecho! Cada arresto es una sola sanción: las estadísticas la cuentan una sola vez.');
});

// ===========================================================================
//  JEFE DE ESTUDIOS
// ===========================================================================
demo('estudios_estadisticas', false, async ({ p, paso })=>{
  await entrar(p, 'ESTUDIOS', 2500);
  await paso('#cia', 'Compañía y sección', 'Elige <b>Compañía</b> y <b>Sección</b>, o deja <b>Todas</b>. En el ejemplo, la 3ª Compañía.');
  await p.selectOption('#cia', '3');
  await paso('#verBtn', 'Actualizar', 'Pulsa <b>Actualizar</b>.');
  await p.click('#verBtn'); await p.waitForTimeout(1500);
  await paso('#totales', 'Cuadros superiores', 'Número de refuerzos, rebajes, arrestos y sanciones. <b>No se muestran datos personales</b>.', {margen:4});
  await paso('#tipos', 'Por tipo y medida', 'Leves y graves, y cuántas hay de cada medida correctora.', {margen:4});
  await paso('#fundamentos', 'Fundamentos legales', 'Cuántas veces se ha aplicado cada fundamento, con su tipo y letra.', {margen:4});
  await paso('#motivos', 'Motivos agrupados', 'Los motivos escritos a mano, agrupando textos parecidos. La columna <b>Cómo se escribió</b> muestra las variantes.', {margen:4});
  await paso('#secciones', 'Por sección', 'Refuerzos, rebajes, arrestos y sanciones de cada sección, para comparar.', {margen:4});
  await paso(null, 'Fin', '¡Hecho! El jefe de estudios no puede modificar nada. Si olvida su contraseña, la cambia el Súper Administrador.');
});

// Al final: necesita el rebaje y el refuerzo creados en las demos del jefe de sección.
demo('peloton_rebref', true, async ({ p, paso })=>{
  await entrar(p, 'PELOTON1');
  await paso('#tabBtnRebRef', 'Pestaña «Rebajes / Refuerzos»', 'Solo la ves si tu jefe de sección te ha dado el permiso <b>Ver rebajes/refuerzos</b>.', {margen:6});
  await p.click('#tabBtnRebRef'); await p.waitForTimeout(1000);
  await paso('#rebRefInstrRebajesBody', 'Rebajes vigentes', 'Alumnos con rebaje <b>vigente</b> y su tipo (<b>parcial</b> o <b>total/clase</b>). Es solo de consulta: no puedes crear ni eliminar.', {margen:4});
  await paso('#rebRefInstrRefuerzosBody', 'Refuerzos vigentes', 'Y los refuerzos vigentes, con su tipo (IFM, estudio o entreno). Si el refuerzo es de varios alumnos, junto al nombre aparece «(+N)».', {margen:4});
  await paso(null, 'Fin', '¡Hecho! Útil antes de una actividad para saber quién está rebajado.');
});

/*MAS_DEMOS*/

// ---------------------------------------------------------------------------
(async()=>{
  const b = await chromium.launch({args:['--lang=es-ES'], env:Object.assign({}, process.env, {LANG:'es_ES.UTF-8', LANGUAGE:'es_ES:es', LC_ALL:'es_ES.UTF-8'})});
  const previo = `${OUT}/demos.json`;
  const demos = (SOLO.length && fs.existsSync(previo)) ? JSON.parse(fs.readFileSync(previo, 'utf8')) : {};
  const recursos = { foto: await fotoFicticia(b), pdf: pdfFicticio('Documento de ejemplo - datos ficticios') };

  for (const d of DEMOS){
    if (SOLO.length && SOLO.indexOf(d.nombre) === -1) continue;
    const vp = d.movil ? {width:390,height:780} : {width:1280,height:780};
    const ctx = await b.newContext({viewport:vp, deviceScaleFactor: d.movil ? 2 : 1.25, isMobile:!!d.movil, hasTouch:!!d.movil, locale:'es-ES', timezoneId:'Europe/Madrid', acceptDownloads:true});
    const p = await ctx.newPage(); p.on('dialog', x=>x.accept());
    const pasos = []; let n = 0;
    // Borra las capturas anteriores de esta demo.
    fs.readdirSync(OUT).filter(f=>f.startsWith(d.nombre + '_') && /_\d\d\.jpg$/.test(f)).forEach(f=>fs.unlinkSync(`${OUT}/${f}`));
    // Captura un paso: `sel` es lo que hay que pulsar (o null), `texto` lo que se explica.
    async function paso(sel, titulo, texto, opts={}){
      let caja = null;
      if (sel){
        const el = p.locator(sel).first();
        if (!opts.sinScroll) await el.scrollIntoViewIfNeeded().catch(()=>{});
        await p.evaluate(()=>window.scrollTo(0, window.scrollY));   // nunca desplazado a la derecha
        await p.waitForTimeout(250);
        const bb = await el.boundingBox();
        if (bb){ const m = opts.margen == null ? 4 : opts.margen;
          caja = { x:(bb.x-m)/vp.width*100, y:(bb.y-m)/vp.height*100, w:(bb.width+2*m)/vp.width*100, h:(bb.height+2*m)/vp.height*100 }; }
        else console.log('  ** SIN CAJA para', sel);
        if (caja){   // la zona nunca se sale de la pantalla
          const x2 = Math.min(100, caja.x + caja.w), y2 = Math.min(100, caja.y + caja.h);
          caja.x = Math.max(0, caja.x); caja.y = Math.max(0, caja.y); caja.w = x2 - caja.x; caja.h = y2 - caja.y;
        }
      }
      await p.waitForTimeout(350);
      const archivo = `${d.nombre}_${String(++n).padStart(2,'0')}.jpg`;
      await p.screenshot({path:`${OUT}/${archivo}`, type:'jpeg', quality:72});
      pasos.push({ img: archivo, caja: caja, titulo: titulo, texto: texto });
      console.log(d.nombre, n, titulo);
    }
    async function firmar(canvasSel){
      const bb = await p.locator(canvasSel).boundingBox();
      await p.mouse.move(bb.x+25, bb.y+bb.height*0.6); await p.mouse.down();
      for (let i=0;i<14;i++) await p.mouse.move(bb.x+25+i*(bb.width-50)/14, bb.y+bb.height*(0.55+0.22*Math.sin(i*0.9)));
      await p.mouse.up();
    }
    try {
      await d.fn({ p, ctx, b, paso, firmar, recursos });
      demos[d.nombre] = { movil: !!d.movil, ancho: vp.width, alto: vp.height, pasos: pasos };
    } catch (err){
      console.log('  ** ERROR en', d.nombre, '->', err.message.split('\n')[0]);
      await p.screenshot({path:`${OUT}/ERROR_${d.nombre}.png`}).catch(()=>{});
    }
    await ctx.close();
    fs.writeFileSync(previo, JSON.stringify(demos, null, 1));
  }
  await b.close();
})();
