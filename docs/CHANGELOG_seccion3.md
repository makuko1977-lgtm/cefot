# CHANGELOG — Sección 3 (CEFOT-2 / BAL 3ª CÍA)

Registro de cambios de la herramienta de gestión de sección (`seccion3.html` / panel Admin).

Las entradas anteriores al 07/09/2026 se conservan como hitos de la línea
histórica de la versión monofichero. El 07/09/2026 documenta el cambio de
comportamiento del aviso de coincidencias de fechas.

---

## 2026-09-07 — Coincidencias de fechas por alumno (Arrestos y Refuerzos)

### Resumen

El aviso de coincidencias deja de ser un diálogo único «Aceptar / Cancelar»
sobre la fecha del expediente completo. Pasa a resolverse **alumno a alumno**,
con calendario propio, y puede **separar** a quienes tienen conflicto en
expedientes nuevos e independientes.

Sustituye funcionalmente la descripción anterior del manual, que solo
contemplaba mantener o anular la misma fecha para todos.

### Interfaz

- Si al guardar un **Arresto** o un **Refuerzo** las fechas solapan con un
  arresto o refuerzo ya existente de alguno de los alumnos del parte, se
  abre el panel de resolución de coincidencias.
- Cada alumno afectado tiene **su propio calendario**.
- Los días ya ocupados por arresto o refuerzo se muestran en **rojo**,
  **tachados** y **no son seleccionables**.
- Se puede asignar una **fecha distinta a cada alumno**.
- Los alumnos **sin conflicto** permanecen en el expediente original, con
  las fechas que se indicaron al guardar.
- Cada alumno separado obtiene un **expediente nuevo e independiente**:
  se copian los datos ya registrados (tipo de falta, fundamento, motivo,
  medida, autoridad, etc.) y solo cambia la planificación de fechas.

### Comportamiento por flujo

| Flujo | Qué ocurre |
|---|---|
| Alta nueva de Arresto | Se detectan solapes con arrestos y refuerzos previos. Quien no choca se queda en el expediente recién creado. Quien choca elige fechas libres; al confirmar se genera un expediente de arresto nuevo para ese alumno. |
| Alta nueva de Refuerzo | Igual, sobre el parte de refuerzo que se está creando. |
| Edición de un refuerzo ya existente | Se mantiene el flujo específico de edición (`excludeRefuerzoId`): el refuerzo que se está editando no cuenta como coincidencia consigo mismo. Si un alumno del grupo pasa a tener conflicto con *otro* registro, se separa a un refuerzo nuevo; el original conserva al resto. |

### Detección

Sigue usándose el cruce de rangos (`rangosFechaSeSolapan`) entre:

- refuerzos (`fechaInicio`–`fechaFin`) de cada alumno del parte;
- sanciones con medida **Arresto** y fecha ya fijada (`arrestoPendiente` no cuenta).

Al editar se excluye el propio registro (`excludeSancionId` / `excludeRefuerzoId`).

### Funciones JS afectadas (versión monofichero / Admin)

- `buscarFechasCoincidentes`
- `confirmarFechaSinCoincidencia` (deja de ser el `confirm()` único)
- `validarFechaArrestoSinCoincidencia`
- alta / guardado de sanciones con medida Arresto
- alta / guardado y edición de refuerzos
- render del calendario por alumno y generación del expediente hijo

### Notas

- No cambia la numeración global de expedientes: el servidor (o el contador
  local en la versión monofichero) asigna el siguiente número al expediente
  separado.
- El DNI del alumno en pantalla puede ir enmascarado salvo para el súper
  administrador; la separación se hace por **número de protocolo**.

---

## 2026-09-03 — Hito previo (línea monofichero)

Último registro conservado de la secuencia histórica anterior al cambio de
coincidencias. Incluía el aviso clásico: si las fechas coincidían, el
usuario solo podía **aceptar** (guardar igual) o **cancelar** (volver a
elegir otra fecha para todo el expediente).

---

## Referencia de ficheros en este repositorio

| Fichero | Uso |
|---|---|
| `docs/CHANGELOG_seccion3.md` | Este registro |
| `docs/MANUAL_seccion3_addendum_2026-09-07.md` | Actualización del manual |
| `docs/manual_seccion3_actualizado_2026-09-07.pdf` | Addendum en PDF |
| `public/admin.html` | Panel del jefe de sección (servidor) |
