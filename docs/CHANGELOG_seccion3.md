# Historial de cambios — seccion3.html

Este documento recoge, en orden cronológico, las actualizaciones que se van
haciendo sobre `seccion3.html` (la versión de un solo archivo de la app
CEFOT-2 BAL/3ª CÍA). Sirve como control de cambios para poder comparar esta
versión con la que está desplegada en el servidor y decidir qué actualizar
allí.

Cada entrada indica la fecha, qué se pidió, qué se cambió exactamente y en
qué parte del archivo.

---

## 2026-08-28 — Refuerzo manual: campos y documento ANEXO

**Petición:** cuando se crea un refuerzo manual (no derivado de una
sanción), el botón "Rellenar documento" no aparecía, a diferencia de los
refuerzos generados automáticamente desde una sanción.

**Causa:** el botón genera el documento oficial ANEXO (resolución de
corrección académica), que necesita datos que el formulario de refuerzo
manual nunca pedía: expediente, profesor que lo ordena, fundamento legal,
trámite de audiencia y Jefe de Compañía que resuelve.

**Cambio:** se añadieron esos campos al formulario de "Nuevo refuerzo"
(pestaña Refuerzos), visibles solo en modo manual — si el refuerzo viene de
una sanción se siguen rellenando automáticamente como hasta ahora. Se
asigna número de expediente propio a los refuerzos manuales (mismo
contador que usan las sanciones) y se activa el botón "Rellenar documento"
para ambos orígenes.

- Nuevos campos en el formulario: Día / Lugar / Hora de la infracción,
  Empleo / Nombre / Apellidos / DNI del profesor, Tipo de falta y
  Fundamento legal (mismo catálogo que en Sanciones), Motivo del refuerzo.
- Los campos de "Trámite de audiencia" y "Jefe de Compañía" (que ya
  existían pero solo se pedían para refuerzos de sanción) pasan a ser
  obligatorios también en modo manual.
- Nuevas variables/funciones JS: `refFecha`, `refLugar`, `refHora`,
  `refTipoFalta`, `refEmpleo`, `refProfNombreInput/List`,
  `refProfApellidosInput/List`, `refProfDniInput`, `refFundamento`,
  `refMotivoInput/List`, bloque `#refInfraccionFields`,
  `refreshRefuerzodatalists()`.

---

## 2026-08-28 — Refuerzo manual: modo Individual/Múltiple

**Petición:** dar la opción de que el refuerzo manual también admita varios
alumnos a la vez, igual que en Sanciones.

**Cambio:** se añadió el mismo selector "Individual / Múltiple" que ya
existía en Sanciones al formulario de "Nuevo refuerzo" manual. En modo
múltiple se puede buscar y marcar varios alumnos; al guardar se crea un
único expediente compartido para todos ellos, y el documento generado usa
automáticamente la plantilla ANEXO I (múltiple) en vez de la individual.
En modo borrador (refuerzo derivado de una sanción) el selector se oculta,
ya que el alumno o los alumnos ya vienen fijados desde la sanción de
origen.

- Nuevos elementos HTML: `#refModeToggle`, `#refModeIndividualBtn`,
  `#refModeMultipleBtn`, `#refIndividualWrap`, `#refMultipleWrap`,
  `#refMultiSearch`, `#refMultiList`, `#refMultiChipsManual`,
  `#refMultiHint`.
- Nuevas funciones JS: `setRefMode()`, `renderRefMultiList()`,
  `renderRefMultiChipsManual()`.
- El elemento `#refMultiChips` (ya existente) se conserva solo para la
  vista de solo lectura de los refuerzos que vienen de una sanción con
  varios alumnos.

---

## 2026-08-28 — Refuerzos: leyenda "RELLENADO"

**Petición:** al generar (rellenar) el documento de un refuerzo desde la
pestaña Refuerzos, que aparezca la leyenda "RELLENADO" para poder controlar
a simple vista qué documentos ya se han generado/impreso y cuáles no. En
los refuerzos múltiples, la leyenda debe aparecer también en todas las
filas de los alumnos afectados.

**Cambio:** cada vez que se genera correctamente el documento PDF de un
refuerzo (botón "Rellenar documento"), el registro del refuerzo se marca
como `rellenado: true` (con fecha) y se guarda. Como en un refuerzo
múltiple todos los alumnos comparten el mismo registro, la leyenda
aparece automáticamente en todas sus filas del listado. El botón sigue
disponible después de marcarlo, por si hace falta volver a generar el
documento.

- Nuevos campos en el registro de refuerzo: `rellenado` (booleano),
  `rellenadoFecha` (fecha ISO).
- Cambios en `generarDocumentoPDF()`: tras generar el PDF, marca el
  registro y vuelve a pintar el listado (`renderRefuerzosList()`).
- Nueva clase CSS `.fill-badge` para la etiqueta "RELLENADO" (verde,
  estilo consistente con el resto de etiquetas de la tabla).

---

## 2026-08-31 — Nueva pestaña "Actividades" (FFMG / FFE) + consulta

**Petición:** una pestaña nueva para registrar quién ha participado en los
ejercicios, marchas, tiros y exámenes de cada fase del ciclo (FFMG / FFE),
y poder consultarlo después desde Consultas dejando explícito de qué fase
se trata.

**Cambio:** nueva pestaña **Actividades**, con un selector de fase
(FFMG / FFE, mismo patrón que Individual/Múltiple en Sanciones y
Refuerzos). La fase FFE viene precargada con las 17 actividades de la FFE
CICLO 1º 2026 (Marcha 15km, Tiro 1, Tiro 2, JIP, Conferencias DIPE, Marcha
25km, Conferencias DIAPER, Tiro 3, Examen E. Física, Examen PMC, Ejercicio
Alfa, Examen Teórico, Recuperación PMC, Recuperación E.F., Recuperación
Teor., Vacunaciones, Confirmación); la fase FFMG empieza vacía y se rellena
a mano con "Añadir actividad" (pendiente de que se facilite su listado).

Cada actividad tiene una fecha (opcional, editable en cualquier momento) y
una lista de participantes. Al pulsar "Seleccionar participantes" se abre
un panel con buscador, una casilla "Seleccionar todos" que marca a todo el
personal de la sección, y casillas individuales para desmarcar a quien no
hizo la actividad. Las actividades se pueden eliminar (con confirmación),
tanto en FFMG como en FFE.

En **Consultas** se añadió el tipo "Personal que ha participado en una
actividad": se elige la fase (FFMG/FFE, obligatorio) y, opcionalmente, una
actividad concreta (o "todas las actividades de esta fase") y un rango de
fechas. El informe generado deja explícita la fase en la cabecera y
reutiliza el botón "Imprimir" ya existente.

- Nuevos elementos HTML: pestaña `#tabBtnActividades` / panel
  `#actividadesPanel` (selector de fase, alta de actividad, tabla), modal
  `#actParticipantesModal`; en Consultas, `#consActividadFaseWrap`,
  `#consActFaseSelect`, `#consActActividadSelect` y la opción "actividades"
  en `#consTipoSelect`.
- Nuevo array persistido `actividades` (clave `seccion3_actividades_v1`),
  constante `ACTIVIDADES_FFE_SEED` con el catálogo de FFE, funciones
  `persistActividades()`, `loadActividadesFromStorage()`,
  `seedActividadesFFEIfEmpty()`, `renderActividadesTab()`,
  `setActFase()`, y el flujo de selección de participantes
  (`openActParticipantesModal()`, `renderActParticipantesList()`, etc.).
- En Consultas: `computeConsultaActividades()` y
  `renderConsultaActividadesResultados()`, además de extender el listener
  de `consTipoSelect`/`consBuscarBtn` para soportar el nuevo tipo sin tocar
  el comportamiento de la consulta existente (rebaje/refuerzo/arresto).

**Pendiente:** falta el listado de actividades de la fase FFMG — en cuanto
se facilite, se puede precargar igual que se hizo con FFE.

---

## 2026-08-31 — Consultas > Actividades: por alumno y "quién no ha participado"

**Petición:** las fechas de inicio/fin de la consulta no aportan nada (lo
que importa es saber quién ha asistido); hace falta poder buscar por
alumno para ver qué actividades ha hecho y cuáles no (con casilla de
sí/no y la fecha de cada una); y en la consulta por actividad es más útil
poder ver quién NO ha participado, al ser normalmente una lista más corta.

**Cambio:**
- Se quitó el filtro de fechas de inicio/fin de la consulta de
  Actividades (seguía disponible para "Personal rebajado, en refuerzo o
  en arresto", que sí lo necesita).
- La consulta de Actividades ahora tiene dos modos, con el mismo selector
  Individual/Múltiple ya usado en otras pestañas: **"Por actividad"**
  (como antes: fase + actividad o todas) y **"Por alumno"** (nuevo: se
  busca al alumno y se listan TODAS las actividades de la fase elegida,
  con su fecha y una columna Sí/No de si participó).
- En el modo "Por actividad" se añadió la casilla **"Mostrar quienes NO
  han participado"**, que invierte el listado (compara contra todo el
  personal de la sección en vez de contra los participantes guardados).

- Nuevos elementos HTML: selector de modo `#consActModoToggle`
  (`#consActModoActividadBtn` / `#consActModoAlumnoBtn`), envoltorios
  `#consActPorActividadWrap` / `#consActPorAlumnoWrap`, casilla
  `#consActNoParticiparonCheck`, buscador de alumno
  `#consActAlumnoInput`/`#consActAlumnoList`/`#consActAlumnoPreview`/
  `#consActAlumnoHint`. Se quitó el uso de `#consFechasWrap` para el tipo
  "actividades".
- Nuevas funciones JS: `setConsActModo()`, `buildConsActAlumnoOptions()`,
  `computeConsultaActividadesPorActividad()` (con parámetro `invertir`),
  `renderConsultaActividadesPorActividadResultados()`,
  `computeConsultaActividadesPorAlumno()`,
  `renderConsultaActividadesPorAlumnoResultados()`. Sustituyen a las
  `computeConsultaActividades()` / `renderConsultaActividadesResultados()`
  de la entrada anterior (que ya no existen).

---

## 2026-08-31 — Sanciones: arresto con fecha pendiente de fijar

**Petición:** cuando la medida correctora de una sanción es Arresto, a
veces no se sabe todavía la fecha en el momento de redactar la sanción.
Hace falta poder dejarla como "pendiente" en vez de obligar a rellenar
fecha de inicio y fin, y poder consultarla después para no perder de vista
qué arrestos quedaron sin fecha.

**Cambio:** dentro del bloque de Arresto del formulario de "Nueva sanción"
se añadió un selector **"Fecha conocida" / "Pendiente"**, con el mismo
patrón visual que el resto de selectores de modo de la app. Con "Fecha
conocida" (opción por defecto) el formulario se comporta igual que hasta
ahora: hay que indicar fecha de inicio y fin del arresto. Con "Pendiente"
se ocultan esos campos y se guarda la sanción sin fecha, mostrando un
aviso de que se podrá fijar más adelante.

En el listado de Sanciones, las sanciones de arresto pendientes muestran
una etiqueta **"Pendiente"** y, justo debajo, un mini-formulario con dos
campos de fecha y un botón **"Fijar fecha"** para completarlas en cuanto
se sepa, sin tener que editar la sanción entera. Al fijar la fecha, la
etiqueta desaparece y la sanción pasa a mostrarse igual que una de fecha
conocida.

En **Consultas** se añadió el tipo **"Sanciones de arresto con fecha
pendiente"**, que no necesita fase ni rango de fechas: simplemente lista
todas las sanciones de arresto que se guardaron como pendientes y siguen
sin fecha, con expediente, alumno, pelotón, fecha de la sanción y motivo.

- Nuevos elementos HTML: `#sanArrestoWrap` (envuelve a los campos de fecha
  ya existentes, `#sanArrestoFields`), selector `#sanArrestoModoToggle`
  (`#sanArrestoModoFechaBtn` / `#sanArrestoModoPendienteBtn`), aviso
  `#sanArrestoPendienteNote`; en el listado, `.arresto-pendiente-form` con
  sus campos `.arr-fecha-ini` / `.arr-fecha-fin` y botón `.arr-guardar-btn`;
  en Consultas, opción `arresto_pendiente` en `#consTipoSelect`.
- Nuevo estado JS `sanArrestoModo` ("fecha" | "pendiente") y función
  `setSanArrestoModo()`. Nuevos campos en el registro de sanción:
  `arrestoPendiente` (booleano); `arrestoFechaIni` / `arrestoFechaFin` /
  `arrestoDias` se guardan vacíos mientras está pendiente.
  `validateSanForm()` y `buildSanRecord()` actualizados para no exigir
  fecha cuando el modo es "Pendiente". `formatMedidaCorrectora()` añade
  "(fecha pendiente)" cuando corresponde.
- El listener de "Fijar fecha" en la tabla de Sanciones actualiza el
  registro (`arrestoFechaIni`, `arrestoFechaFin`, `arrestoDias`,
  `arrestoPendiente = false`), lo persiste y vuelve a pintar el listado.
- Nuevas funciones en Consultas: `computeConsultaArrestoPendiente()` y
  `renderConsultaArrestoPendienteResultados()`, y la rama correspondiente
  en el listener de `consBuscarBtn`.
- Nueva clase CSS `.arresto-pendiente-form` para el mini-formulario inline.
  Se reutiliza la clase `.status-pill.programado` (ya existente) para la
  etiqueta "Pendiente".

---

## 2026-08-31 — Consultas > Arresto pendiente: agrupar por expediente

**Petición:** en la consulta de sanciones de arresto con fecha pendiente,
poder agruparlas por expediente (una sanción múltiple pendiente afecta a
varios alumnos a la vez, y verlos sueltos en una lista plana no deja ver
que van juntos).

**Cambio:** se añadió la casilla **"Agrupar por expediente"** justo debajo
del selector de tipo de consulta, visible solo para el tipo "Sanciones de
arresto con fecha pendiente". Sin marcar, la consulta se comporta igual
que hasta ahora (listado plano, una fila por alumno). Marcada, el informe
se organiza en una sección por expediente (mismo estilo que las secciones
de la consulta de Actividades), con la fecha y el motivo de la sanción en
la cabecera de cada sección y una tabla con los alumnos afectados dentro.
La casilla se reinicia a "sin marcar" cada vez que se vuelve a elegir este
tipo de consulta.

- Nuevos elementos HTML: `#consArrestoPendienteWrap` (envoltorio, oculto
  salvo para el tipo `arresto_pendiente`) con la casilla
  `#consArrestoAgruparCheck`.
- Nuevas funciones JS: `computeConsultaArrestoPendienteAgrupado()` (agrupa
  directamente desde `sanciones`, una entrada por expediente con su lista
  de alumnos ordenada por apellido) y
  `renderConsultaArrestoPendienteAgrupadoResultados()` (reutiliza el
  patrón visual `.consulta-section` ya usado en Actividades). El listener
  de `consTipoSelect` oculta/muestra `#consArrestoPendienteWrap` y
  reinicia la casilla; el listener de `consBuscarBtn` bifurca según
  `consArrestoAgruparCheck.checked` entre el listado plano existente y el
  nuevo agrupado.

---

## 2026-08-31 — Sanciones: vincular a un expediente ya cursado

**Petición:** al crear una sanción nueva, poder integrarla en un expediente
que ya existe en vez de abrir uno nuevo cada vez (por ejemplo, una falta
distinta del mismo caso, que debe quedar bajo el mismo número de
expediente que las anteriores).

**Cambio:** en el formulario de "Nueva sanción", justo debajo de la
selección de alumno(s), se añadió la casilla **"Vincular esta sanción a
un expediente ya cursado (en vez de abrir uno nuevo)"**. Al marcarla
aparece un buscador (mismo patrón que el resto de buscadores de alumno de
la app) donde se escribe el número de expediente, o el nombre/número de
un alumno que ya esté en él, y se elige de la lista. El resto del
formulario se rellena igual que una sanción normal — fecha, tipo de
falta, fundamento, motivo, medida correctora, etc., son propios de esta
nueva falta — pero al guardar, en vez de pedir un número de expediente
nuevo, se usa el número elegido. Así, un mismo expediente puede acabar
teniendo varias sanciones (varias faltas, posiblemente de fechas y
alumnos distintos) bajo un único número.

Si no se marca la casilla, el comportamiento no cambia: cada sanción
nueva sigue abriendo su propio expediente, como hasta ahora.

- Nuevos elementos HTML: casilla `#sanVincularExpedienteCheck` y
  envoltorio `#sanVincularExpedienteWrap` con el buscador
  `#sanExpedienteInput`/`#sanExpedienteList`/`#sanExpedientePreview`/
  `#sanExpedienteHint`.
- Nuevas funciones JS: `buildSanExpedienteOptions()` (lista de expedientes
  ya existentes, uno por número, con un resumen de sus alumnos y motivo,
  para el datalist) y `findSancionByExpediente()`. Nuevo estado
  `sanExpedienteSeleccionado`.
- `validateSanForm()` exige elegir un expediente válido cuando la casilla
  está marcada; `buildSanRecord()` usa ese número en vez de llamar a
  `nextExpedienteNumero()` cuando corresponde (el contador de expedientes
  no se toca en ese caso, ya que no se abre uno nuevo). `clearSanForm()` y
  los mensajes de guardado (`sanSaveBtn`) se actualizaron en consecuencia.
- La estadística "Expedientes registrados" de la pestaña Sanciones pasa a
  contar números de expediente **distintos** en vez de sanciones
  registradas, ya que ahora pueden no coincidir.

---

## 2026-08-31 — Actividades: catálogo precargado de la fase FFMG

**Petición:** precargar en la pestaña Actividades el catálogo de la fase
FFMG (15 actividades), igual que ya estaba precargada la FFE.

**Cambio:** la fase FFMG viene ahora precargada con sus 15 actividades
(Marcha 08 KM, Marcha 12 KM, Marcha 20 KM, JIP I, JIP II, Maniobras,
Examen Teóricos, Examen Pruebas Físicas, Recuperación Pruebas Físicas,
Recuperación Teóricas, Tiro I, Tiro II, Noptel, Tiro III, Jura de
Bandera), con el mismo comportamiento que ya tenía la FFE: cada una sin
fecha ni participantes hasta que se rellenan a mano, y se pueden seguir
añadiendo o eliminando actividades libremente en ambas fases.

- Nueva constante `ACTIVIDADES_FFMG_SEED` con el catálogo de FFMG.
- La función de siembra se generalizó a `seedActividadesFaseIfEmpty(fase,
  seed)`, reutilizada tanto por `seedActividadesFFEIfEmpty()` como por la
  nueva `seedActividadesFFMGIfEmpty()` (misma lógica idempotente que ya
  tenía FFE: no se repite si ya hay actividades de esa fase guardadas, ni
  aunque se hayan borrado todas después). Se llama a ambas en el arranque
  de la página.

---

## 2026-09-01 — Sanciones: corregido el campo al vincular a expediente

**Petición (corrección):** al elegir un expediente ya cursado desde el
buscador (p. ej. el nº 4), el campo se quedaba con el texto completo de
la opción (alumnos y motivo incluidos) en vez de solo el número, lo que
llevaba a confundirlo con otro expediente (se reportó que, al elegir el
"004", el campo parecía mostrar "001").

**Cambio:** ahora, en cuanto se elige un expediente de la lista, el campo
se queda únicamente con su número (p. ej. "4"); el resumen de alumnos y
motivo de ese expediente se sigue mostrando debajo, en la vista previa
verde, pero ya no se mezcla con el número dentro del propio campo de
texto. Si se teclea el número a mano no cambia nada (sigue funcionando
igual que antes).

- `sanExpedienteInput`: en su listener de `input`, cuando el texto
  reconocido viene de una opción elegida de la lista (contiene el guion
  largo "—" que separa el número del resumen), el campo se reescribe con
  `String(record.expediente)` en cuanto se resuelve el expediente. Cuando
  el texto es un número tecleado directamente a mano, el campo no se
  toca.

---

## 2026-09-01 — Consultas: quitar a un alumno de un expediente

**Petición:** desde las consultas, poder borrar directamente sin tener
que ir a la pestaña Sanciones — dejando claro que lo que se borra es al
alumno dentro de ese expediente, no el expediente en sí (que puede seguir
teniendo otros alumnos u otras sanciones vinculadas).

**Cambio:** se añadió una columna **"Acciones"** con el botón **"Quitar
del expediente"** en las tres tablas de Consultas que listan alumnos de
sanciones: el listado plano y el agrupado de "Sanciones de arresto con
fecha pendiente", y la sección "Sancionados (arresto)" de "Personal
rebajado, en refuerzo o en arresto en un periodo" (las secciones de
Rebajados y En refuerzo no llevan esta acción, al no ser sanciones). Al
pulsarlo se pide confirmación explicando qué va a pasar exactamente: se
quita a ese alumno de esa sanción/expediente concretos; si otros alumnos
u otras sanciones comparten el mismo número de expediente, no se tocan.
Solo si ese alumno era el único que quedaba en esa sanción en particular,
esa sanción desaparece por quedarse sin nadie — el número de expediente
en sí no se "borra" como tal, sigue existiendo si tiene más contenido.
Tras confirmar, la propia consulta se vuelve a ejecutar con los mismos
filtros para reflejar el cambio al momento, y el cambio queda también
reflejado en la pestaña Sanciones. La columna "Acciones" no sale al
imprimir el informe.

- Nueva función compartida `quitarAlumnoDeExpedienteDesdeConsulta(sancionId,
  numero, nombreCompleto, expediente)`: localiza la sanción por `id`,
  quita a ese alumno de su array `alumnos`, y si se queda vacío elimina
  la sanción entera (sin tocar ninguna otra). `botonQuitarExpedienteHtml()`
  genera el botón con los `data-*` necesarios, y
  `wireQuitarAlumnoDeExpedienteEnConsulta(container)` conecta el clic y
  vuelve a lanzar `consBuscarBtn` para refrescar.
- Las filas que devuelven `computeConsultaArrestoPendiente()`,
  `computeConsultaArrestoPendienteAgrupado()` (por grupo) y
  `computeConsultaEstadoPeriodo()` (solo `sancionados`) incorporan ahora
  `sancionId` (y `expediente`, donde faltaba) para poder identificar la
  sanción exacta.
- Nueva clase CSS `.no-print`, aplicada a la cabecera y celdas de
  "Acciones", junto con la regla `body.print-consulta .no-print{display:
  none !important;}` para que no aparezca en el informe impreso.

---

## 2026-09-01 — Consultas: elegir qué expedientes imprimir

**Petición:** en la consulta "Sanciones de arresto con fecha pendiente"
agrupada por expediente, poder elegir qué expediente(s) imprimir en vez
de imprimir siempre el listado completo.

**Cambio:** cada expediente del informe agrupado lleva ahora su propia
casilla **"Imprimir"** junto al título. Se puede marcar uno, varios o
todos; al pulsar el botón "Imprimir" general, si hay al menos un
expediente marcado, el documento impreso incluye solo esos — el resto no
sale. Si no se marca ninguno, el comportamiento no cambia: se imprime el
informe completo, como hasta ahora. Las casillas (y el aviso que las
explica) no aparecen en el papel, solo sirven para elegir en pantalla.

- Cada `.consulta-section` del informe agrupado lleva ahora
  `data-exp-idx` y, dentro de su `<h4>`, una casilla
  `.consExpPrintCheck` (con la misma clase `.no-print` de otras
  acciones, para que no salga al imprimir).
- El listener de `consImprimirBtn` comprueba si hay casillas
  `.consExpPrintCheck:checked`: si las hay, marca esas secciones con la
  clase `print-selected` y añade `print-filtro-expediente` al `<body>`;
  si no hay ninguna marcada, no toca nada y se imprime todo, igual que
  antes. El listener de `afterprint` limpia siempre esas clases al
  terminar, tanto si se filtró como si no.
- Nueva regla CSS de impresión `body.print-consulta.print-filtro-expediente
  .consulta-section[data-exp-idx]:not(.print-selected){display:none
  !important;}`, y estilo `.exp-print-check` para la propia casilla en
  pantalla.

**Recordatorio (ya corregido, se reconfirma que sigue así):** en
Sanciones, el buscador de "vincular a un expediente ya cursado" sigue
dejando en el campo solo el número de expediente al elegir uno de la
lista, sin mezclarlo con los nombres de los alumnos — se comprobó de
nuevo tras este cambio y sigue funcionando correctamente.

---

## 2026-09-02 — Sanciones: dos filtros de alerta por reincidencia (5+ en total / 3+ mismo fundamento legal)

**Petición:** en la pestaña Sanciones, sustituir el filtro único de
"Alerta" (que combinaba, sin distinguirlo, 5 o más sanciones en total con
3 o más de igual "Motivo" en texto libre) por dos filtros independientes:
uno para alumnos con **5 o más sanciones en total**, sin tener en cuenta
el fundamento legal, y otro para alumnos con **3 o más sanciones que
comparten el mismo "Fundamento legal (según tipo de falta)"**. Además, al
activar cualquiera de los dos, la propia tabla debe mostrar, fila por
fila, cuál de los dos criterios (o ambos) cumple cada alumno.

**Cambio:**

- `computeSanctionAlerts()` ahora agrupa por `fundamento` (el desplegable
  "Fundamento legal según tipo de falta") en lugar de por `motivo` (texto
  libre). Se añadió el helper `fundamentoNorm(f)` (igual que el ya
  existente `motivoNorm(m)`, para comparar ignorando acentos). El objeto
  que devuelve por cada alumno cambia de nombres: `maxMotivo` →
  `maxFundamento` (y se añade `maxFundamentoTexto`, el texto tal cual del
  fundamento más repetido, para mostrarlo como pista), `motivoAlert` →
  `fundamentoAlert`. El campo `totalAlert` (5+ en total) no cambia de
  lógica, solo de nombre de constante.
- La constante `ALERT_SAME_MOTIVO_THRESHOLD` pasa a llamarse
  `ALERT_SAME_FUNDAMENTO_THRESHOLD` (sigue valiendo 3).
  `ALERT_TOTAL_THRESHOLD` (5) no cambia.
- En el HTML de Sanciones, el desplegable único `#sanAlertaFilter` se
  sustituye por **dos** desplegables independientes, cada uno con
  "Todos / Solo con... / Solo sin...": `#sanAlertaTotalFilter` ("5+ en
  total") y `#sanAlertaFundamentoFilter` ("3+ mismo fundamento"). La
  cabecera de la tabla pasa de "Alerta" a "Alertas" (una fila puede llevar
  más de una etiqueta a la vez).
- En `renderSancionesList()`: la tarjeta de estadística "Alumnos con
  alerta" se sustituye por dos tarjetas ("Con 5+ sanciones en total" /
  "Con 3+ mismo fundamento legal"); el filtrado usa los dos nuevos
  desplegables de forma independiente (cada uno puede exigir que sí, que
  no, o no filtrar); y la celda de alerta de cada fila ahora construye
  hasta dos etiquetas por separado — `<span class="status-pill
  alerta">5+ total</span>` y/o `<span class="status-pill
  programado">3+ fundamento</span>` (cada una con un `title` que detalla
  el motivo exacto, por ejemplo cuántas veces se repite el mismo
  fundamento y cuál es) — en vez de una única etiqueta genérica "Alerta".
  Si no cumple ninguno de los dos criterios, se mantiene el guion "—" de
  siempre. Nueva clase CSS `.alert-badges` para apilar las etiquetas
  dentro de la celda.
- Los demás sitios donde ya se usaba `computeSanctionAlerts()` se
  actualizaron para seguir funcionando con los nuevos nombres de campo:
  el aviso de antecedentes al escribir el número de alumno en el
  formulario de nueva sanción (`sanCadeteInput`, ahora dice "veces el
  mismo fundamento legal" en vez de "veces el mismo motivo"), y la
  etiqueta de "Alerta por reincidencia" del historial del alumno, que
  antes tenía el texto fijo "3 o más sanciones por el mismo motivo"
  (aunque en realidad pudiera estar saltando solo por el total) y ahora
  compone el texto según qué criterio(s) se cumplan realmente. El resumen
  de la Ficha del alumno y el texto del PDF de resumen no cambian, porque
  ya usaban el campo genérico `hasAlert` sin detallar el motivo.

**Prueba:** `test_sanciones_alertas_fundamento.py` — crea un alumno con 3
sanciones del mismo fundamento legal (sin llegar a 5 en total) y otro con
5 sanciones en total alternando dos fundamentos distintos (de forma que
también termina acumulando 3 veces uno de ellos), y comprueba: las dos
tarjetas de estadística, que cada alumno lleva exactamente las etiquetas
que le corresponden en su fila (uno solo "3+ fundamento", el otro ambas
etiquetas a la vez), el comportamiento de los dos filtros por separado
(Sí/No/Todos), que el antiguo `#sanAlertaFilter` ya no existe, y que el
aviso de antecedentes al buscar un alumno menciona el fundamento legal.
Captura: `screenshot_sanciones_alertas_fundamento.png`.

---

## 2026-09-03 — Refuerzos: horario propio de fin de semana y edición del documento ya generado

**Petición:** dos cambios en Refuerzos (tanto en el alta manual como en la derivada automáticamente de una sanción, ya que ambas comparten el mismo formulario): 1) si el periodo del refuerzo incluye algún sábado o domingo, poder indicar un horario distinto al de entre semana para esos días (porque, por ejemplo, "de lunes a sábado, de 18:00 a 21:00" no tiene sentido el sábado). 2) Poder editar los datos de un refuerzo cuyo documento ya se generó ("RELLENADO") y volver a obtener el PDF corregido.

**Cambio 1 — horario de fin de semana:**

- Nuevo bloque de campos `#refFindeWrap` (oculto por defecto) con `#refHoraInicioFinde` y `#refDuracionFinde`, debajo de "Duración (horas)" en el formulario de Refuerzos.
- Se muestra automáticamente en cuanto el rango elegido (`refFechaInicio`–`refFechaFin`) contiene algún sábado o domingo — comprobado con las nuevas funciones `esFinDeSemanaIso(iso)` y `rangoTieneFinde(inicio, fin)`, y la función `updateRefFindeVisibility()` (llamada desde `validateRefDatesLive()`, que ya se disparaba al cambiar cualquiera de las dos fechas). Si el rango no incluye fin de semana, el bloque permanece oculto y el refuerzo funciona exactamente igual que antes.
- Cuando el bloque está visible, sus dos campos pasan a ser obligatorios para poder guardar.
- El registro de refuerzo guarda `horaInicioFinde` y `duracionFinde` (vacíos si no aplica).
- `generarDocumentoPDF()` ahora reparte los días del periodo en dos grupos (entre semana / fin de semana) cuando corresponde: cada línea de día (`LUNES día 24: hora (de...)`) usa el horario que le toca, y la frase introductoria ("Dedicar X horas al día durante...") se amplía con una segunda cláusula ("y Y horas al día durante sábado y domingo") solo cuando efectivamente hay días de fin de semana con horario propio. Si el refuerzo no tiene fin de semana en su periodo (o es un registro antiguo sin estos campos), el texto generado es idéntico al de siempre — no hay cambios de redacción para los refuerzos existentes.

**Cambio 2 — editar un refuerzo ya "rellenado":**

- La leyenda `RELLENADO` de la lista de Refuerzos pasa de ser un simple texto a un botón (`<button class="fill-badge" data-editref="...">RELLENADO ✎</button>`) — se indica con el icono de lápiz que es interactivo.
- Al pulsarla se llama a la nueva función `startEditRefuerzo(id)`, que limpia el formulario y lo vuelve a rellenar con **todos** los datos del refuerzo elegido: alumno(s) (reconstruyendo el modo individual/múltiple y las selecciones), fechas, tipo, horario de entre semana y de fin de semana si lo tenía, observaciones, y todos los campos del documento (día, lugar, hora, tipo de falta, fundamento legal — disparando el evento cambio para recargar sus opciones —, motivo, profesor, audiencia, jefe de compañía, lugar y fecha de la resolución). Se muestra un aviso `#refEditBanner` ("Editando el refuerzo Nº X...") con un botón "Cancelar edición" que descarta los cambios sin tocar el registro.
- Se añade la variable de estado `editingRefuerzoId`. El listener de `refSaveBtn` ahora detecta si hay un id en edición: si lo hay, en vez de crear un registro nuevo sustituye el existente conservando su identidad (`id`, `expediente`, `origen`, `sancionId`, `createdAt`) y aplicando el resto de campos tal cual estén ahora en el formulario — incluidos los campos del documento, aunque el refuerzo original viniera de una sanción (`refuerzoDraft` se deja en `null` durante la edición a propósito, para que esos campos se tomen del formulario y no queden fijados al borrador original). Al guardar una edición se marca `editado: true` y `editadoFecha`, y se llama automáticamente a `generarDocumentoPDF(record)` para descargar ya mismo el PDF corregido (a diferencia de un alta nueva, que no descarga nada hasta que se pulsa "Rellenar documento").
- El tooltip de la leyenda ahora indica también la fecha de la última edición cuando aplica ("Documento generado el ... · Editado por última vez el ...").
- De paso se corrige un fallo existente en el formateo de esa fecha: `rellenadoFecha`/`editadoFecha` se guardan como marca de tiempo completa (`toISOString()`) y `formatDateDisplay()` espera solo `AAAA-MM-DD`; al pasarle la marca completa sin recortar, el tooltip mostraba una fecha corrupta (p. ej. "03T08:43:59.935Z/09/2026"). Ahora se recorta a los 10 primeros caracteres antes de formatear.

**Prueba:** `test_refuerzo_finde_y_edicion.py` — comprueba la aparición/ocultación del bloque de fin de semana según el rango de fechas, que sus campos bloqueen el guardado si están vacíos estando visibles, que el PDF generado contenga el texto correcto (frase introductoria con las dos cláusulas, y cada línea de día con su horario) parseando el PDF resultante con `pypdf`, la edición completa de un refuerzo individual (precarga de datos, descarga automática del PDF corregido al guardar, que no se duplique la fila, que el tooltip mencione la edición), que "Cancelar edición" no modifique el registro, y que editar un refuerzo múltiple conserve correctamente el modo y los alumnos seleccionados. También se comprueba, como regresión, que un refuerzo sin fin de semana en su periodo genera el mismo texto de siempre (sin mención a sábado/domingo). Se actualizó además `test_refuerzo_rellenado.py`, cuya aserción sobre el texto exacto de la leyenda ("RELLENADO") ya no aplicaba al llevar ahora el icono de edición; se cambió a comprobar que empieza por "RELLENADO". Capturas: `screenshot_refuerzo_finde_lista.png`, `screenshot_refuerzo_edicion.png`.

---

## 2026-09-04 — Aviso de copia de seguridad (y corrección del backup de Actividades)

**Petición:** los datos viven solo en el navegador del equipo; hacía falta
blindar la disciplina de copias sin prometer una persistencia que el
archivo no puede dar.

**Cambio:** banner de aviso en la parte superior de la aplicación que
aparece cuando hay datos registrados y (a) nunca se ha exportado una copia,
o (b) hace más de 7 días de la última. Lleva "Exportar copia ahora" y
"Recordar más tarde" (esta última lo silencia solo durante la sesión
actual, vía `sessionStorage`). Al importar una copia se considera reciente
y el aviso queda oculto.

- Nuevos elementos: `#backupReminderBanner`, `#backupReminderText`,
  `#backupReminderExportBtn`, `#backupReminderDismissBtn`.
- Nueva clave `LAST_BACKUP_KEY` en localStorage, escrita en
  `exportBackup()` y al importar; función `updateBackupReminder()`.
- **Corrección aparte:** `exportBackup()` no incluía `actividades` en el
  archivo exportado, de modo que una copia de seguridad perdía toda la
  pestaña Actividades al restaurarla. Se añadió al objeto exportado y al
  flujo de importación.

**Pruebas:** `test_backup_reminder.py`, `test_backup_import.py`.

---

## 2026-09-04 — Aviso de fechas coincidentes (arresto y refuerzo)

**Petición:** al crear una sanción o un refuerzo con fechas de inicio y fin,
avisar si esas fechas ya están dadas para ese alumno, para poder elegir otra
o mantenerla. Con la matización de que el aviso debe salir también al fijar
más adelante la fecha de un arresto que se dejó pendiente.

**Cambio:** al guardar una sanción cuya medida es Arresto con fecha ya
conocida, o un refuerzo, se comprueba si alguno de los alumnos afectados
tiene ya otro arresto o refuerzo cuyo periodo se solape, aunque solo
coincida un día. Si lo hay, se muestra un aviso con el detalle (alumno,
fechas y número de expediente o refuerzo con el que choca) y se puede
mantener o cancelar el guardado. La misma comprobación se aplica en el
mini-formulario "Fijar fecha" de los arrestos pendientes.

- Nuevas funciones: `rangosSolapan()`, `buscarFechasCoincidentes()`,
  `confirmarFechaSinCoincidencia()`, `validarFechaArrestoSinCoincidencia()`.
- Enganchada en tres sitios: `sanSaveBtn`, `refSaveBtn` y el botón
  `.arr-guardar-btn` del listado de Sanciones.

**Prueba:** `test_fecha_coincidente.py`.

---

## 2026-09-04 — Sanciones: seguimiento de los trabajos (fecha límite y vencidos)

**Petición:** cuando se manda un trabajo como medida correctora, poder
marcar con un clic si se ha hecho o no, ponerle fecha de finalización y que
salte un aviso si llega la fecha sin haberlo marcado.

**Cambio:** al elegir "Trabajo no superior a 5 horas" como medida
correctora, el formulario pide además una fecha límite (obligatoria). En el
listado de Sanciones, esa falta muestra una casilla **Hecho** que se marca
con un clic; mientras no se marque y la fecha límite ya haya pasado, la
fila enseña la etiqueta **Vencido**. El mismo seguimiento está disponible
en un informe dedicado de Consultas ("Sanciones de trabajo: hechos,
pendientes y vencidos"), con casilla para marcar desde ahí y filtro
"Mostrar solo los vencidos"; el informe se reordena solo para poner
primero los vencidos.

- Nuevos campos en el registro: `trabajoFechaFin`, `trabajoHecho`,
  `trabajoHechoFecha`. Nuevos elementos `#sanTrabajoWrap`,
  `#sanTrabajoFechaFin`, `#sanTrabajoHint`; en Consultas,
  `#consTrabajosWrap` / `#consTrabajosSoloVencidosCheck` y la opción
  `trabajos` en `#consTipoSelect`.
- Nuevas funciones: `esTrabajo()`, `trabajoVencido()`,
  `toggleTrabajoHecho()`, `computeConsultaTrabajos()`,
  `renderConsultaTrabajosResultados()`.

**Prueba:** `test_trabajos.py`.

---

## 2026-09-05 — Sanciones: exportar las seleccionadas a Excel (HOJA DE SANCIONES) y campo Fase

**Petición:** poder seleccionar sanciones del listado y generar una hoja de
Excel con esos datos, con el formato de la "HOJA DE SANCIONES" en papel.

**Cambio:** cada fila del listado de Sanciones lleva una casilla de
selección, más una casilla "Seleccionar todo lo filtrado" que marca de golpe
lo visible con los filtros activos (la selección se conserva al cambiar de
filtro). Con al menos una marcada se activa **"Exportar seleccionadas a
Excel"**, que descarga un libro con **una hoja por alumno sancionado**
(si un expediente afecta a varios alumnos, una hoja por cada uno), con los
campos y el orden de la hoja en papel: protocolo, nombre y apellidos, mando
sancionador, fase, motivo, tipo de falta, fundamento legal completo en
"SANCIÓN", medida correctora, fecha y observaciones.

Se añadió además al formulario de alta un campo opcional **Fase**
(FFMG / FFE), que no existía y que ese formato requiere.

- Nuevos elementos: `#sanSelectAllCheck`, `#sanSeleccionCount`,
  `#sanExportExcelBtn`, columna de casillas en `#sancionesTable`,
  `#sanFaseInput`. Nuevo campo `fase` en el registro de sanción.
- Nuevas funciones: `todasLasFilasSanciones()`, `filtrarFilasSanciones()`
  (extraída de `renderSancionesList()` para compartir el filtrado),
  `sanRowKey()`, `updateSanSeleccionUI()`, `sheetNameFor()`,
  `exportSancionesSeleccionadasExcel()`.

**Prueba:** `test_export_sanciones_excel.py` (verifica el .xlsx descargado
con openpyxl: número de hojas, nombres y contenido celda a celda).

---

## 2026-09-06 — Exportación a Excel: cambio de librería a ExcelJS

**Causa:** la librería xlsx.js incrustada (edición comunitaria) **no puede
escribir estilos en celdas nuevas** — ni colores, ni negrita, ni tamaño, ni
tipo de letra. Se comprobó escribiendo un archivo de prueba con tamaño 18 y
letra Arial y releyéndolo: volvía todo a Calibri 12. Solo conserva estilos
que ya venían en un archivo leído previamente.

**Cambio:** se incrustó **ExcelJS 4.4.0** (MIT, también gratuita) como
cuarto bloque `<script>`, usada únicamente para generar este export; xlsx.js
se mantiene para leer hojas de cálculo. El Excel exportado quedó
deliberadamente sencillo, según lo pedido: **solo texto**, sin celdas
combinadas ni colores, con el único formato de tamaño y tipo de letra
(título en cuerpo 14, resto en 11, todo Calibri).

- El archivo pasa de ~2,1 MB a ~3,0 MB por la librería incrustada; sigue
  funcionando sin conexión, que era el motivo de incrustarla.
- `buildHojaSancionSheet()` se sustituye por `addHojaSancionSheet()`, con
  la API asíncrona `wb.xlsx.writeBuffer()` y descarga vía Blob.

---

## 2026-09-07 — Nueva pestaña "Cuestionario de notas"

**Petición:** poder adjuntar una o varias hojas de cálculo/CSV con las notas
de un examen, indicar la nota mínima, cotejarlas con el listado de la
sección (por número de protocolo o por primer apellido) y sancionar desde
ahí a quien no llegue.

**Cambio:** nueva pestaña **Cuestionario de notas** (nombre elegido para no
confundirla con el "Cuestionario inicio de curso" de Roster). Admite añadir
varios archivos, cada uno como una tarjeta con: columnas detectadas
automáticamente por el nombre de cabecera (protocolo/número, apellido,
nota) y corregibles a mano, y **su propia nota mínima**. El botón
**Comprobar** coteja cada fila primero por número de protocolo y, si no lo
encuentra, por primer apellido; las filas ambiguas o no identificadas se
cuentan aparte como incidencias en vez de adivinar. Del listado resultante
se marcan alumnos y **"Sancionar seleccionados"** abre Sanciones en modo
Múltiple con esos alumnos precargados y el motivo relleno, de modo que se
reutiliza tal cual el aviso de fechas coincidentes ya existente.

Los archivos y resultados de esta pestaña son solo de trabajo: no se
guardan ni forman parte de la copia de seguridad.

- Nuevos elementos: `#tabBtnNotas`, `#notasPanel`, `#notasFileInput`,
  `#notasArchivosWrap`, `#notasComprobarBtn`, `#notasResultados`,
  `#notasSancionarBtn`.
- Nuevas funciones: `parseHojaNotasGenerica()`, `parseNota()`,
  `renderNotasArchivos()`, `buscarAlumnoNotas()`, `renderNotasResultados()`,
  `sancionarSeleccionadosDeNotas()`.

**Prueba:** `test_cuestionario_notas.py`.

---

## 2026-09-07 — Cuestionario de notas: los no presentados

**Petición (corrección):** faltaba contemplar a quien no ha realizado el
examen y por tanto no tiene nota — hay que incluirlos junto a los que no
llegan a la nota mínima.

**Causa:** el bucle recorría solo las filas del archivo de notas, así que un
alumno del listado que no apareciera en la hoja quedaba invisible, y el que
aparecía con la nota vacía acababa en el contador de incidencias, sin
casilla para sancionarlo.

**Cambio:** el resultado recoge ahora dos situaciones, ambas sancionables y
diferenciadas en la columna de nota: los que están **por debajo de la
mínima** (con su nota) y los **no presentados**, que incluyen tanto a quien
figura en el archivo sin una nota utilizable (celda vacía, "NP", un guion o
cualquier valor no numérico) como a quien **no aparece en el archivo** pero
sí en el listado de la sección. Encabezando cada archivo va el recuento de
cada grupo; la tabla ordena primero los suspensos y luego los no
presentados. El motivo prellenado al sancionar distingue el caso ("Nota
inferior a 5 en …" / "No presentado a …").

- Nueva función `filaResultadoNotas()` con el campo `estado`
  ("suspenso" | "no_presentado"); nueva clase `.notas-resumen`.
- Salvaguarda añadida: si un alumno aparece en más de una fila del archivo,
  se tiene en cuenta la primera y se avisa como incidencia.
- **A tener en cuenta:** como todo alumno del listado que no figure en el
  archivo cuenta como no presentado, si la hoja cubre solo a parte de la
  sección (un pelotón, los convocados de ese día) el resto aparecerá también
  como no presentado. Fue una decisión consciente, no un descuido.

**Prueba:** `test_notas_no_presentados.py`.

---

## 2026-09-07 — Coincidencia de fechas: recuadro con calendario y expediente aparte

> Nota: este hito se implementó con otra aplicación, partiendo de la versión
> anterior. Queda aquí verificado y documentado.

**Petición:** cuando salta el aviso de que un alumno tiene coincidencia de
fechas, que a ese alumno le salga un recuadro para darle otra fecha y
generar un expediente aparte, tomando todos los datos ya registrados.

**Cambio:** el `confirm()` de "mantener o cancelar" se sustituye, en el alta
de sanciones (arresto con fecha conocida) y en el alta de refuerzos, por un
modal **"Coincidencia de fechas · asignación alternativa"**. Cada alumno
afectado tiene **su propio calendario**, con los días ya ocupados por otro
arresto o refuerzo en rojo, tachados y no seleccionables. Al confirmar:

- el expediente original conserva a **todos los alumnos sin conflicto**, con
  las fechas originales;
- **cada alumno con conflicto genera un expediente independiente**, clonando
  todos los datos del acta (fecha, lugar, hora, tipo de falta, fundamento,
  motivo, medida, profesor, observaciones) y sustituyendo únicamente el
  periodo. Los días se recalculan solos.

- Nuevos elementos: `#fechaCoincidenciaModal` y su contenido
  (`#fechaCoincidenciaCasos`, `#fechaCoincidenciaGuardarBtn`,
  `#fechaCoincidenciaCancelarBtn`), calendario `.fecha-cal-day` con las
  clases `busy` / `disabled` / `selected` / `in-range`.
- Nuevas funciones: `resolverCoincidenciasPorAlumno()` (async),
  `pedirNuevasFechasParaAlumnos()`, `renderFechaCoincidenciaCasos()`,
  `renderFechaCasoCalendario()`, `rangoEstaDentroDeDiasOcupados()`.
  `buildSanRecord()` acepta un segundo parámetro `forceNuevoExpediente`.
  `sanSaveBtn` y `refSaveBtn` pasan a ser `async`.

**Dos matices comprobados, por si interesa cambiarlos más adelante:**

1. Siguen con el aviso antiguo (sin calendario ni expediente aparte): el
   mini-formulario **"Fijar fecha"** de un arresto que quedó pendiente, y la
   **edición** de un refuerzo ya existente (esto último es deliberado y está
   comentado en el código: no fragmenta la identidad de un registro ya
   guardado).
2. En el alta de sanciones y refuerzos **ya no se puede forzar un solape**:
   el calendario bloquea los días ocupados, así que o se elige un hueco
   libre o se cancela. Antes el aviso permitía guardar igualmente.

**Prueba:** `test_coincidencia_expediente_aparte.py` — comprueba con una
sanción múltiple (un alumno con conflicto y otro sin él) que se abre el
modal solo para el afectado, que los días ocupados salen bloqueados, y que
al asignar fecha alternativa se generan dos expedientes distintos con las
fechas correctas y con todos los demás datos del acta idénticos. También
que cancelar no guarda nada.

---

## 2026-09-09 — v23: pestaña "Horas UA", consulta de expediente y filtros avanzados

> Hito implementado con otra aplicación. Queda aquí verificado y documentado.

Tres bloques independientes en la misma versión.

**1 — Nueva pestaña "Horas UA" (horas por unidad de aprendizaje)**

Catálogo docente completo incrustado en el propio archivo, para llevar el
control de qué horas lectivas se han impartido y cuáles no. Se organiza en
dos fases (FFMG y FFE) y **7 módulos** (FM-I 80 h, I/A-I 129 h, FFyOC-I 3 h,
FM-II 18 h, I/A-II 26 h, ART 110 h y FFyOC-II 20 h), cada uno con sus
unidades didácticas y sus unidades de aprendizaje, con las horas teóricas y
prácticas de cada una.

Cada hora genera un **hueco** al que se le pone fecha. Se puede fechar hueco
a hueco, o aplicar de golpe la misma fecha a todos los huecos pendientes de
una UA ("Aplicar a pendientes", que respeta los que ya tienen fecha), y
quitar las fechas de una UA. Arriba se muestra una **alarma de horas sin
impartir** con el recuento por fase y por módulo, una barra de progreso por
módulo, y filtros Pendientes / Impartidas / Todas.

- Bloques nuevos: `<section id="pestana-horas-ua">`, catálogo
  `<script id="cefot2-horas-ua-catalogo" type="application/json">` (v1.0.0,
  ~31 KB) y módulo `<script id="cefot2-horas-ua-js">`, encapsulado en su
  propia IIFE (no comparte variables con el resto de la aplicación).
- Se incrustan además **dayjs** y su plugin `customParseFormat`, coherente
  con el criterio de no depender de ninguna CDN.
- Las fechas se guardan aparte, en la clave `cefot2_ua_fechas` de
  localStorage (independiente del resto de datos de la aplicación).
- Botones "Exportar" y "Vaciar" por módulo.

**2 — Consultas: "Consulta de expediente (informe completo)"**

Nuevo tipo de consulta que, dado un número de expediente, saca un informe
con todo lo asociado a él: sanciones y refuerzos, con sus alumnos y datos.
El número se valida mientras se escribe (entero positivo; «4» y «004» se
consideran el mismo) y una vista previa adelanta cuántas sanciones y
refuerzos tiene antes de consultar. Si no existe, avisa y no muestra
informe.

- Nuevos elementos: `#consExpedienteWrap`, `#consExpedienteInput`,
  `#consExpedienteList`, `#consExpedientePreview`, `#consExpedienteHint`, y
  la opción `expediente` en `#consTipoSelect`.
- Nuevas funciones: `expedienteNorm()`, `parseExpedienteInput()`,
  `validarExpediente()`, `registrosDeExpediente()`,
  `buildConsExpedienteOptions()`, `computeConsultaExpediente()`,
  `renderConsultaExpedienteResultados()`,
  `actualizarValidacionConsultaExpediente()`.

**3 — Filtros avanzados en Roster y filtros por columna en Sanciones**

En Roster, botón "Filtros avanzados" que despliega filtros por **sexo**
(hombres/mujeres) y por **situación** (con rebaje vigente, con sanción, sin
rebaje vigente), combinables con el buscador y con los filtros de pelotón y
unidad ya existentes. Los criterios activos se muestran como **chips** y hay
un botón "Limpiar filtros".

En Sanciones, cada columna de la tabla incorpora su propio campo de filtro
(expediente, número, alumno, pelotón, fecha, tipo, motivo y medida), que se
combinan entre sí y con los filtros generales.

- Nuevos elementos: `#rosterAdvToggle`, `#rosterAdvPanel`, `#sexoFilter`,
  `#situacionFilter`, `#rosterFilterChips`, `#rosterComboFormula`,
  `#rosterClearFilters`; en Sanciones, `#sanFiltroExp`, `#sanFiltroNumero`,
  `#sanFiltroAlumno`, `#sanFiltroPelotonCol`, `#sanFiltroFecha`,
  `#sanFiltroTipoCol`, `#sanFiltroMotivo`, `#sanFiltroMedida`.
- Nuevas funciones: `criteriosRosterActivos()`, `pintarChipsRoster()`,
  `pintarStatsRoster()`.

**Verificación realizada sobre esta versión:**

- Sintaxis correcta en los 9 bloques `<script>` (3 librerías + dayjs y su
  plugin + inicializador + app + catálogo JSON + módulo Horas UA); el
  catálogo JSON parsea sin errores.
- Sin colisiones de nombres: el módulo de Horas UA va encapsulado en su
  propia IIFE.
- Los 8 conjuntos de pruebas anteriores siguen pasando sin regresiones.
- Prueba nueva `test_v23_nuevas_funciones.py`: en Horas UA comprueba el
  fechado de un hueco, que "Aplicar a pendientes" no pisa los ya fechados,
  el progreso del módulo, la persistencia tras recargar y "Quitar fechas";
  en Consultas, que el informe de expediente encuentra el registro (también
  escribiendo «001» en vez de «1»), que un expediente inexistente avisa y
  oculta el panel, y que una entrada no numérica muestra el aviso; en
  Roster, el filtrado por sexo y por situación, los chips y "Limpiar
  filtros"; y en Sanciones, los filtros por columna de número y motivo.
- Tamaño del archivo: ~3,1 MB (era ~3,0 MB), por el catálogo y dayjs.

**Dos observaciones menores, por si quieren corregirse más adelante:**

1. En el CSS de Horas UA hay dos reglas `@media` con el selector `.grid`
   **sin prefijar** por `#pestana-horas-ua`. Hoy no molesta porque el resto
   de la aplicación usa `field-grid`, `category-grid`, etc., y nunca la
   clase `grid` a secas; pero si algún día se añadiera, se pisarían.
2. En la consulta de expediente, al escribir un número que no existe, la
   vista previa en verde del expediente anterior sigue visible junto al
   aviso en rojo de que no existe. Es solo estético: al consultar, el
   informe se oculta correctamente y el mensaje es el adecuado.

---

## 2026-09-10 — Horas UA: el encabezado toma la compañía y sección reales

**Petición:** en la opción UA, el encabezado debe ser el de la sección y
compañía a la que pertenece.

**Causa:** el encabezado de la pestaña "Horas UA" venía escrito a mano en el
HTML («CEFOT-2 · BAL / 3.ª Compañía · Sección 3»), mientras que el resto de
la aplicación deduce la compañía y la sección de los números de protocolo
del listado cargado (`computeSeccionInfo()`: de un 32001 saca 3ª compañía,
sección 2). Con cualquier listado que no fuera el de la 3ª/Sección 3, la
pestaña contradecía a la cabecera de la propia aplicación: se veía
«SECCIÓN 2» arriba y «SECCIÓN 3» dentro de Horas UA.

**Cambio:** ese encabezado pasa a calcularse con los mismos datos que la
cabecera general, de modo que ambos coinciden siempre y se actualizan solos
al cargar otro listado. Si no hay listado cargado (o los números no siguen
el patrón esperado), se mantiene el valor por defecto de la aplicación
(3ª compañía · sección 3), igual que hace la cabecera.

- Al párrafo `.kicker` de `<section id="pestana-horas-ua">` se le da el id
  `horasUaKicker`; `applySeccionBranding()` lo actualiza junto a
  `brandTitle`, `brandMark` y `document.title`, usando `seccionOrdinal()`.
- No se toca el módulo de Horas UA: el encabezado es HTML estático fuera de
  su contenedor `#cefot2-horas-ua-app`, así que sus re-dibujados no lo
  pisan.

**Prueba:** `test_horasua_encabezado.py` — carga dos listados distintos
(32001/32002 → 3ª compañía, sección 2; y 21001/21002 → 2ª compañía, sección
1) y comprueba en cada caso que el encabezado de Horas UA coincide con la
cabecera de la aplicación, y que ya no aparece la sección fija anterior.
Los otros 9 conjuntos de pruebas siguen pasando.

---

## 2026-09-10 — Bajas: el alumno sale de la sección pero no se pierde su información

**Petición:** cuando se elimina a un alumno o alumna, sus datos deben
guardarse aparte en un listado con toda la información de lo que ha hecho o
no, para tenerla disponible si hace falta. En ese listado se mantendría
igual que si estuviese en la sección, pero en cómputo numérico no es
contable, porque no está.

**Causa:** hasta ahora la baja **borraba** al alumno del roster
(`state.rows = state.rows.filter(...)`) y así lo advertía el aviso: «Esta
acción no se puede deshacer». Sus rebajes, sanciones y refuerzos seguían
guardados, pero al desaparecer del roster ya no había forma de abrir su
ficha ni su historial: la información quedaba huérfana e inaccesible.

**Cambio:** la baja ya no borra, **mueve**. El alumno pasa a un listado de
bajas que conserva su fila íntegra (todos sus datos de filiación y su foto)
más la fecha de baja. Como vive fuera de `state.rows`:

- **No cuenta en nada**: ni en las estadísticas del roster, ni en los
  recuentos de las demás pestañas, ni en las consultas. No hubo que tocar
  ninguna de esas cuentas — al no estar en el listado de la sección, quedan
  excluidas solas.
- **No se puede seleccionar**: no aparece en los buscadores de alumnos de
  Rebajes, Sanciones, Refuerzos ni Actividades.
- **Se conserva todo**: su ficha y su historial siguen abriéndose con
  normalidad, con sus rebajes, sanciones, refuerzos y actividades intactos.

En la pestaña Roster se añade un selector **«En la sección» / «Bajas (n)»**
con el mismo patrón visual del resto de la aplicación. La vista de bajas
usa la misma tabla y las mismas columnas que el listado normal —de ahí que
se vea «igual que si estuviese en la sección»— más una columna con la fecha
de baja, y sustituye el botón «Baja» por **«Reincorporar»**, que devuelve al
alumno a la sección con todo su historial (recolocándolo por número).
Buscador y filtros funcionan también sobre las bajas.

- Nuevo array `state.bajas`, incluido en `persist()`, `loadFromStorage()` y
  —importante— en la **copia de seguridad**: se exporta dentro de `roster`
  y se restaura al importar, de modo que una copia no pierde las bajas. El
  resumen previo a importar indica cuántas trae.
- `bajaAlumno()` mueve la fila y le añade `_bajaFecha`; nuevas funciones
  `reincorporarAlumno()`, `buscarEnBajas()`, `rosterFuenteActual()` y
  `setRosterVista()`.
- `findCadetByNumero()` acepta un segundo parámetro `incluirBajas`
  (por defecto `false`, para que un alumno de baja no sea seleccionable);
  solo `openFicha()` y `openHistorial()` lo usan con `true`.
- El texto de confirmación de la baja se reescribe: ya no dice que la acción
  es irreversible, sino que el alumno pasa al listado de bajas conservando
  toda su información y que puede reincorporarse.
- Nuevos elementos: `#rosterVistaToggle` (`#rosterVistaActivosBtn` /
  `#rosterVistaBajasBtn`), `#rosterBajasCount`, `#rosterBajasNota`.

**Prueba:** `test_bajas_listado.py` — da de baja a un alumno que tiene un
rebaje y una sanción registrados y comprueba: que el recuento de la sección
baja de 2 a 1, que desaparece del listado y del buscador de Sanciones, que
el contador del botón «Bajas» pasa a (1), que el listado de bajas conserva
sus datos de filiación y muestra la fecha de baja, que su historial sigue
mostrando el rebaje y la sanción y su ficha sus datos, que la baja sobrevive
a recargar la página, que la copia de seguridad la incluye, y que al
reincorporarlo vuelve al recuento (2) con el historial intacto. Los otros 10
conjuntos siguen pasando.

---

## 2026-09-11 — Corrección: el trabajo se marca alumno por alumno, no por expediente

**Petición:** en Consultas, al filtrar por trabajos pendientes, al marcar o
desmarcar una casilla no se hacía de forma individual; lo mismo en la
pestaña Sanciones al filtrar por medida correctora.

**Causa:** el estado del trabajo se guardaba en **un único campo del
expediente** (`trabajoHecho`) y la función que lo cambiaba recibía solo el
id de la sanción (`toggleTrabajoHecho(sancionId, hecho)`). En un expediente
compartido por varios alumnos, el listado muestra una fila por alumno, pero
todas esas filas leían y escribían ese mismo campo: marcar a uno marcaba a
todos. Se reprodujo el fallo antes de tocar nada —sanción de trabajo para
32001 y 32002, marcar solo a 32001— y ambas casillas quedaban marcadas, con
`trabajoHecho: true` en los datos guardados. El filtro por medida correctora
no era la causa: solo hacía más visible el problema, porque deja a la vista
las filas del mismo expediente juntas.

**Cambio:** el estado pasa a ser de cada alumno. Cada sanción guarda un mapa
`trabajoHechoPor` (número de alumno → fecha en que se marcó) en lugar del
booleano único. En consecuencia:

- La casilla **Hecho** del listado de Sanciones y la del informe de
  Consultas llevan ahora también el número del alumno (`data-numero`), y
  solo afectan a esa persona.
- La etiqueta **Vencido** también es individual: si en un expediente
  compartido uno ha entregado el trabajo y el otro no, el primero deja de
  figurar como vencido y el segundo sigue apareciendo.
- El informe de Consultas calcula el estado por alumno, de modo que el
  filtro "Mostrar solo los vencidos" deja de arrastrar a los compañeros del
  mismo expediente que sí lo tienen hecho.
- En la consulta de expediente, el dato "Trabajo hecho: Sí/No" se sustituye
  por un detalle por alumno ("Nº 32001: hecho el 10/09/2026 · Nº 32002:
  pendiente").

**Compatibilidad con lo ya guardado:** las sanciones creadas con el modelo
anterior se convierten automáticamente la primera vez que se cargan
(`migrarTrabajosPorAlumno()`): un `trabajoHecho: true` pasa a dar por hecho
el trabajo de todos los alumnos de ese expediente, que es lo único que
significaba aquel valor, y los campos antiguos se eliminan. La conversión se
aplica también al importar una copia de seguridad antigua.

- Nuevas funciones: `trabajoHechoDe()`, `trabajoHechoFechaDe()`,
  `trabajoVencidoDe()` y `migrarTrabajosPorAlumno()`. `trabajoVencido(r)` se
  mantiene a nivel de expediente ("le queda pendiente a alguno de sus
  alumnos") para el chequeo de incidencias de la consulta de expediente.
  `toggleTrabajoHecho()` pasa a recibir `(sancionId, numero, hecho)`.
- `buildSanRecord()` crea `trabajoHechoPor: {}` en vez de
  `trabajoHecho: false` / `trabajoHechoFecha: null`.

**Prueba:** `test_trabajos_por_alumno.py` — crea una sanción de trabajo
compartida por 32001 y 32002 y comprueba, en el listado de Sanciones, con el
filtro de medida correctora aplicado y en el informe de Consultas, que
marcar y desmarcar afecta solo al alumno elegido; que la etiqueta "Vencido"
desaparece únicamente para quien lo ha hecho; que lo guardado es el mapa por
alumno y ya no el campo antiguo; y que todo se mantiene tras recargar. Los
otros 11 conjuntos siguen pasando.

---

## Cómo usar este documento

Cada vez que se pida un cambio nuevo sobre `seccion3.html`, se añade aquí
una entrada nueva (arriba del todo, o al final, según se prefiera) con la
misma estructura: fecha, petición, causa (si aplica) y detalle técnico del
cambio. Así, antes de actualizar la versión que corre en el servidor, se
puede repasar este documento para saber exactamente qué llevar allí.
