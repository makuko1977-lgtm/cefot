---
name: manual-interactivo
description: Genera, amplía o publica el manual de usuario interactivo de CEFOT-2 (demostraciones paso a paso por roles, en las que se pulsa la zona resaltada para avanzar), con capturas reales del servidor de demostración y la misma interfaz que la aplicación. Úsala cuando se pida añadir o cambiar demostraciones, apartados, roles o el aspecto del manual interactivo.
---

# Manual interactivo de CEFOT-2

Página HTML única y autocontenida que enseña a usar la aplicación como una
demo: el usuario elige su **rol** (pestañas), un **apartado** del índice y
avanza pulsando la **zona roja parpadeante** de cada captura (o «Siguiente»).
Cada rol solo ve sus apartados. Todo es de datos **ficticios**.

- Publicado como artifact privado: https://claude.ai/artifact/M8xkm4bptpGFGTZbVPcchy
  (para actualizarlo desde otra conversación: `Artifact` con `action: "read"`
  sobre esa URL y después `publish` con `url` = esa URL; sin `icon`).
- Se basa en el manual PDF `docs/Manual_usuario_CEFOT2.pdf`: cada apartado
  indica su referencia («Manual PDF · apartado N»).

## Archivos (en `scripts/`)

| Archivo | Qué hace |
|---|---|
| `capturar.js` | Recorre el servidor de demostración con Playwright y guarda, para cada paso, la captura (JPEG) y el recuadro del elemento a pulsar. Escribe `demos.json`. |
| `plantilla.html` | La página del manual. Marcas: `/*APPCSS*/`, `/*DEMOS*/`, `/*IMAGENES*/`. Contiene la lista `ROLES` (roles → grupos → apartados). |
| `construir.py` | Sustituye las marcas: mete `public/shared/app.css` (estilos del servidor), `demos.json` y las imágenes como data: URI. |
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
   NODE_PATH=$(npm root -g) node .claude/skills/manual-interactivo/scripts/capturar.js manual-interactivo-build
   ```
   Las capturas cambian datos del servidor: vuelve a `--reset` antes de repetir.
3. **Montar**:
   ```bash
   python3 .claude/skills/manual-interactivo/scripts/construir.py manual-interactivo-build
   ```
4. **Comprobar** (y mirar `comprobar_pc.png`):
   ```bash
   NODE_PATH=$(npm root -g) node .claude/skills/manual-interactivo/scripts/comprobar.js manual-interactivo-build seccion
   ```
5. **Publicar** `manual-interactivo-build/manual-interactivo.html` como
   artifact (ver URL arriba). La carpeta `manual-interactivo-build/` está en
   `.gitignore`: no se sube al repositorio.

## Añadir una demostración

1. En `capturar.js`, un bloque nuevo:
   ```js
   {
     const { p, ctx, paso, firmar } = await grabadora('capitan_arresto', false); // true = móvil 390x780
     await p.goto(BASE + '/login.html'); ...
     await paso('#selectorAPulsar', 'Título corto', 'Explicación con <b>negritas</b>.', {margen:6});
     await p.click('#selectorAPulsar');           // la acción real, DESPUÉS de capturar
     ...
     await paso(null, 'Fin', '¡Hecho! ...');      // último paso sin zona
     await ctx.close();
   }
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
- Límite del artifact: 16 MB (con 2 demos ocupa ~3,6 MB; JPEG calidad 72).

## Normas

- Solo datos **ficticios** (nombres, DNI, hechos marcados «ficticio»).
- Textos en español correcto: tildes y **ñ** (compañía, sección, pelotón).
- Chromium en español para fechas dd/mm/aaaa: ya lo hace `capturar.js`
  (`--lang=es-ES`, `LANG/LC_ALL=es_ES.UTF-8`, `locale:'es-ES'`).
- No inventar funciones: si la aplicación no lo hace, no aparece en la demo.
  Comprobar en el código (`public/*.html`, `routes/*.js`) antes de explicar.
- Rol de jefe de sección = `admin`; jefe de pelotón = `instructor`.

## Estado y pendientes

Hechas: `peloton_parte` (16 pasos, móvil) y `seccion_sancion` (16 pasos, PC).
Pendientes (en `ROLES` como «Próximamente»): parte múltiple, ficha y foto,
rebajes/refuerzos del pelotón; revisar y ratificar un parte, fijar fecha de
arresto pendiente, amonestación verbal, roster, rebajes, refuerzos,
actividades, consultas, horas UA, jefes de pelotón y permisos, exportar copia
(jefe de sección); entrar en sección y volver, dar curso a un arresto,
consulta por protocolo, historial de arrestos (capitán); estadísticas (jefe
de estudios). Los botones «Rellenar documentos/Imprimir» del capitán siguen
desactivados hasta que el usuario entregue las plantillas de arresto.
