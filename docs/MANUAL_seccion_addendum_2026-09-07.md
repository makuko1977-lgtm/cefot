# Manual de Sección 3 — Actualización 07/09/2026

Este bloque se añade **al final del manual original** sin alterar el
contenido histórico. Sustituye, a efectos de uso, el apartado anterior
del aviso de coincidencias de fechas (que solo contemplaba Aceptar o
Cancelar una misma fecha para todo el expediente).

---

## Coincidencias de fechas en Arrestos y Refuerzos

### Qué se considera coincidencia

Hay coincidencia cuando el rango de fechas que se acaba de indicar para
un alumno **se solapa** con:

- un **refuerzo** ya guardado de ese mismo alumno, o
- un **arresto** ya fechado de ese mismo alumno
  (los arrestos «pendientes de fecha» no ocupan calendario).

El cruce es por **número de protocolo** del alumno, no por el expediente
completo. En un parte con varios alumnos puede haber conflicto solo en
algunos.

### Cómo se resuelve (desde el 07/09/2026)

1. Se comprueba cada alumno del parte por separado.
2. Quien **no** tiene solape permanece en el expediente que se está
   guardando, con las fechas originales.
3. Quien **sí** tiene solape entra en el panel de resolución:
   - ve **su propio calendario**;
   - los días ocupados por arresto o refuerzo aparecen en **rojo**,
     **tachados** y **no se pueden seleccionar**;
   - elige un rango libre, que puede ser distinto al de los demás.
4. Al confirmar, ese alumno **sale** del expediente original y se le
   crea un **expediente nuevo e independiente**.
5. El expediente nuevo copia los datos ya registrados (tipo de falta,
   fundamento, motivo, medida, autoridad, observaciones) y solo cambia
   la planificación de fechas.

### Arrestos y refuerzos

El mismo mecanismo se aplica al dar de alta:

- una sanción con medida **Arresto** (cuando se indican fechas);
- un **Refuerzo**.

### Edición de un refuerzo ya existente

Si se editan las fechas de un refuerzo que ya estaba guardado:

- ese refuerzo no cuenta como coincidencia consigo mismo;
- si, con las nuevas fechas, un alumno del grupo choca con **otro**
  arresto o refuerzo, se le separa a un refuerzo nuevo;
- el refuerzo editado se queda con los alumnos que no tienen conflicto.

### Qué no hace este cambio

- No borra historial ni une expedientes a posteriori.
- No permite pulsar un día rojo del calendario.
- No exige la misma fecha para todos los alumnos de un parte múltiple
  cuando hay conflicto.

### Relación con el identificador de usuario

El campo de acceso de la aplicación servidor se etiqueta **Usuario**.
Es un texto que asigna el súper administrador (letras, números, punto,
guion o `_`, 3–20 caracteres). No tiene que ser un DNI real. El DNI del
**alumno** en el roster puede mostrarse enmascarado salvo para el súper
administrador.
