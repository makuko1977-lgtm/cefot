---
name: tutorial
description: Genera, amplía o publica el manual de usuario interactivo de CEFOT-2 (demostraciones paso a paso por roles, en las que se pulsa la zona resaltada para avanzar), con capturas reales del servidor de demostración y la misma interfaz que la aplicación. Úsala cuando se pida añadir o cambiar demostraciones, apartados, roles o el aspecto del manual interactivo.
---

# Manual interactivo de CEFOT-2

Página HTML única y autocontenida que enseña a usar la aplicación como una
demo: el usuario elige su **rol** (pestañas), un **apartado** del índice y
avanza pulsando la **zona roja parpadeante** de cada captura (o «Siguiente»).
Cada rol solo ve sus apartados. Todo es de datos **ficticios**.

- **Dirección oficial: https://cefot.up.railway.app/manual.html** (dentro de la
  aplicación, en `public/manual.html` + imágenes en `public/manual/`). Railway
  lo despliega al subir a `main`. Admite `?rol=peloton|seccion|capitan|estudios`
  para abrir directamente un rol; cada pantalla de la aplicación tiene un botón
  «Manual» que lo abre con su rol, y el login un enlace.
- Copia antigua como artifact privado: https://claude.ai/artifact/M8xkm4bptpGFGTZbVPcchy
  (solo si el usuario lo pide; para actualizarla: `Artifact` `read` sobre esa
  URL y `publish` con `url`, sin `icon`).
- Se basa en el manual PDF `docs/Manual_usuario_CEFOT2.pdf`: cada apartado
  indica su referencia («Manual PDF · apartado N»).

## Archivos (en `scripts/`)

| Archivo | Qué hace |
|---|---|
| `capturar.js` | Recorre el servidor de demostración con Playwright y guarda, para cada paso, la captura (JPEG) y el recuadro del elemento a pulsar. Escribe `demos.json`. Con `SOLO=demo1,demo2` graba solo esas y conserva las demás. |
| `revisar.js` | Hoja de revisión: una imagen por demo con todos los pasos, la zona roja y el texto (`revision_<demo>.png`). |
| `plantilla.html` | La página del manual. Marcas: `/*APPCSS*/`, `/*DEMOS*/`, `/*IMAGENES*/`. Contiene la lista `ROLES` (roles → grupos → apartados). |
| `construir.py` | `--app`: escribe `public/manual.html` (enlaza `/shared/app.css`) y guarda las imágenes en `public/manual/` (borra las que sobren). Sin `--app`: un único HTML autocontenido para artifact. Las imágenes van en **WebP calidad 75** si está Pillow (`pip install pillow`; `WEBP_CALIDAD=0` deja los JPEG). |
| `comprobar.js` | Abre el HTML en tema oscuro a 1280 y 400 px: comprueba errores JS y desbordamiento lateral y deja capturas. |

## Procedimiento

1. **Servidor de demostración limpio** (datos ficticios, puerto 3000):
   ```bash
   node lib/demo.js --reset        # en segundo plano; esperar a que liste las cuentas
   ```
   Cuentas (contraseña `demo1234`): `SUPERADMIN`, `JEFE33` (jefe de sección
   3ª Cía · Secc. 3), `JEFE31`, `PELOTON1` (todos los permisos), `PELOTON2`
   (solo partes), `CAPITAN3`, `ESTUDIOS`. El alumno 33018 tiene 2 arrestos
   previos tramitados (útil para demos del capitán).
   Para pararlo: `pkill -f "[l]ib/demo.js"` **en un comando aparte** (si la
   misma línea contiene «lib/demo.js», pkill mata su propio shell).
2. **Capturar**:
   ```bash
   NODE_PATH=$(npm root -g) node .claude/skills/tutorial/scripts/capturar.js manual-interactivo-build
   ```
   Las capturas cambian datos del servidor y unas demos preparan datos para
   otras (el orden de la lista `DEMOS` importa): para una grabación completa,
   `--reset` antes. Para repetir una sola: `SOLO=nombre` (revisa antes que
   los datos que necesita siguen ahí). Revisar:
   `node .claude/skills/tutorial/scripts/revisar.js manual-interactivo-build [demo]`.
3. **Montar** (versión de la aplicación):
   ```bash
   python3 .claude/skills/tutorial/scripts/construir.py manual-interactivo-build --app
   ```
   Comprobar en `http://localhost:3000/manual.html` y, en cada rol, que el
   botón «Manual» abre su rol. Después `npm test`, commit y push a la rama de
   trabajo y a `main` (el usuario lo tiene autorizado; Railway despliega solo).
4. **Comprobar la versión artifact** (solo si se monta sin `--app`; mirar `comprobar_pc.png`):
   ```bash
   NODE_PATH=$(npm root -g) node .claude/skills/tutorial/scripts/comprobar.js manual-interactivo-build seccion
   ```
5. Para la versión artifact: montar sin `--app` y usar `comprobar.js`.
   La carpeta `manual-interactivo-build/` está en `.gitignore`; lo que sí se
   sube es `public/manual.html` y `public/manual/*` (imágenes).

## Añadir una demostración

1. En `capturar.js`, un bloque nuevo (utilidades: `entrar`, `sinAvisos`,
   `verDesde`, `arriba`, `api`; `recursos.foto` y `recursos.pdf` son una foto y
   un PDF ficticios para subir):
   ```js
   {
   demo('capitan_arresto', false, async ({ p, paso, firmar, recursos })=>{   // true = móvil 390x780
     await entrar(p, 'CAPITAN3');                  // o paso a paso si la demo enseña el login
     await paso('#selectorAPulsar', 'Título corto', 'Explicación con <b>negritas</b>.', {margen:6});
     await p.click('#selectorAPulsar');           // la acción real, DESPUÉS de capturar
     ...
     await paso(null, 'Fin', '¡Hecho! ...');      // último paso sin zona
   });
   ```
   `paso()` captura la pantalla **antes** de la acción; la zona es el
   elemento que el usuario debe pulsar. `firmar(canvas)` dibuja una firma.
2. En `plantilla.html`, en `ROLES`, dar `id` (= nombre de la demo) y `ref`
   al apartado; los apartados sin `id` salen como «Próximamente».
3. Montar, comprobar y publicar.

Pistas del DOM ya conocidas:
- Login: `#dni, input[type=text]`, `input[type=password]`, botón `button[type=submit]`.
- Jefe de pelotón (`instructor.html`): buscador `#cadeteInput`; hay que
  **pulsar** `#cadeteResults [data-numero]` para seleccionar.
- Jefe de sección (`admin.html`): al entrar puede salir el modal de avisos
  (cerrar con `#cefotAvisosOk`); pestañas `#tabBtnSanciones`, etc.; alumno
  `#sanCadeteInput`; guardar `#sanSaveBtn`; firma `#firmaPrevioCanvas` +
  `#firmaPrevioSiguienteBtn`; listado `#sancionesTableBody`.
- Capitán (`capitan.html`): ventana `#cap-arrestos` (`.ver-datos`,
  `.ver-hist[data-numero]`, `.tramitar`), historial con filtros `#hTexto`…,
  botón «Volver a compañía» al entrar en una sección.

## Estilo (decidido con el usuario — no cambiar sin que lo pida)

- **Mismo modelo de interfaz que el servidor**: se incrusta `public/shared/app.css`
  tal cual; cabecera `header.top` con `.brand .mark` «MU»; roles como
  `.tabbar`; índice y visor en `.panel.corner-accent` (esquina dorada);
  botones `.btn.primary` («Siguiente») y `.btn.ghost`; contadores con
  `.status-pill vigente` y «Próximamente» con `.status-pill finalizado`
  sobre botón discontinuo desactivado; aviso de muestra `.banner-draft`.
- Zona a pulsar en rojo (`var(--danger)`) con pulso; barra de progreso.
- Fuentes Google: Public Sans, Space Grotesk, JetBrains Mono.
- El rol elegido se recuerda en `localStorage` (siempre dentro de try/catch).
- Debe verse bien en móvil (400 px) y en tema oscuro, sin scroll lateral.
- Límite del artifact: 16 MB. Con las 21 demos (192 capturas) ocupa 23,4 MB en
  JPEG y **12,0 MB en WebP 75** (lo que se publica).

## Normas

- Solo datos **ficticios** (nombres, DNI, hechos marcados «ficticio»): `/manual.html` es público, no pide sesión.
- Textos en español correcto: tildes y **ñ** (compañía, sección, pelotón).
- Chromium en español para fechas dd/mm/aaaa: ya lo hace `capturar.js`
  (`--lang=es-ES`, `LANG/LC_ALL=es_ES.UTF-8`, `locale:'es-ES'`).
- No inventar funciones: si la aplicación no lo hace, no aparece en la demo.
  Comprobar en el código (`public/*.html`, `routes/*.js`) antes de explicar.
- Rol de jefe de sección = `admin`; jefe de pelotón = `instructor`.

## Estado y pendientes

Hechas las 22 demostraciones (ninguna «Próximamente»), en este orden de grabación:
`peloton_parte`, `peloton_multiple`, `peloton_ficha`, `seccion_revisar`,
`seccion_sancion` (arresto al 33018, su 3.er arresto), `seccion_fijar_fecha`
(el arresto pendiente del 33007 ratificado en `seccion_revisar`),
`seccion_amonestacion` (parte del 33012 de `peloton_parte`), `seccion_roster`,
`seccion_rebajes`, `seccion_refuerzos`, `seccion_actividades`, `seccion_consultas`,
`seccion_seguimiento` (hoja del 33018: le sube antes una foto ficticia y pulsa
«Guardar cambios» en la ficha, porque en el servidor la foto no se guarda sin él),
`seccion_horasua`, `seccion_usuarios`, `seccion_exportar` (importa la copia en
`legado/seccion3.html`), `capitan_entrar`, `capitan_arresto`, `capitan_protocolo`,
`capitan_historial`, `estudios_estadisticas`, `peloton_rebref`.

Detalles: en las demos del capitán la ventana `#cap-arrestos` se deja en su
sitio (`position:static`) al desplazarse, porque al ser fija tapa la pantalla.
El cuadro de confirmación de la importación local es un `confirm()` del
navegador (no sale en la captura): su texto real se copia en la explicación.
Versión completa publicada (sin la franja «Muestra para revisar»; la cabecera
indica «datos ficticios»).

**Pendiente:** «Rellenar e imprimir los documentos del arresto» (capitán)
figura como «Próximamente» en el grupo «Pendiente de las plantillas». Los
botones «Rellenar documentos/Imprimir» del capitán siguen desactivados hasta
que el usuario entregue las plantillas de arresto; cuando existan, grabar la
demo (`capitan_documentos`), darle `id` y `ref` en `ROLES` y republicar.
