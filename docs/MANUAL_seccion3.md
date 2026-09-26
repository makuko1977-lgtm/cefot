# Manual de Sección 3 — actualizado 09/09/2026

CEFOT-2 · BAL / 3.ª CÍA · Sección 3.

Este texto sustituye, a efectos de uso, el addendum del 07/09/2026 y
describe el monofichero `seccion3.html`.

Se abre con doble clic en el navegador (`file://`). Los datos se guardan
solo en ese dispositivo (`localStorage`). No hace falta internet ni
carpeta `/shared/`: xlsx y pdf-lib van incrustados.

---

## Arranque

1. Abre el HTML.
2. Carga la hoja de la sección (`.ods`, `.xlsx` o `.csv`) la primera vez.
   La próxima se recuerda sola.
3. Pestañas: Roster · Rebajes · Sanciones · Refuerzos · Actividades ·
   Consultas · Cuestionario de notas · **Horas UA**.

Copia de seguridad: exportar / importar JSON desde la cabecera.

---

## Roster

### Filtros (combinación Y)

Todos los filtros activos se cumplen a la vez (intersección):

- Pelotón
- Unidad / destino (columna DESTINO del Excel; ejemplo: GACALEG)
- Búsqueda (nombre, apellidos, número o DNI)
- **Filtros avanzados**
  - Sexo: todos / hombres / mujeres
  - Situación: todas / con rebaje vigente / sin rebaje vigente / con sanción

Ejemplo: Pelotón 1 **y** GACALEG **y** Hombres → solo esos hombres.

La búsqueda, dentro de sí, mira cualquier columna (O). Con el resto de
filtros va en Y.

### Cuadros informativos

**Alumnos** y **Hombres / Mujeres** (y pelotones / unidades visibles)
cuentan **solo el recorte**, no la sección entera.

Si la sección tiene 55 hombres y 12 mujeres y filtras pelotón 1 +
GACALEG, el recuadro pasa a los H/M de ese cruce.

Debajo de los filtros aparece la fórmula:

`Cruce (Y): Pelotón 1 ∩ GACALEG → n alumnos · x H / y M`

Si nadie cumple el cruce, el listado queda vacío y lo dice.

**Limpiar filtros** quita búsqueda, pelotón, destino, sexo y situación.

---

## Horas UA

Captura de horas por unidad de aprendizaje de las guías docentes.

1. Abre la pestaña **Horas UA**.
2. Elige fase: **FFMG** (militar general) o **FFE** (específica).
3. Elige módulo en el desplegable (FM-I, I/A-I, FFyOC-I, FM-II, I/A-II,
   FFyOC-II, ART).
4. Despliega la unidad de aprendizaje.
5. Cada hueco T o P tiene un calendario. Si no hay fecha → alarma.
6. Se puede filtrar pendientes / impartidas / todas, exportar o vaciar.

No se muestra ciclo ni convocatoria.

### Catálogo recortado

| Módulo | Horas | Qué queda fuera |
|---|---|---|
| FM-I | 80 | — |
| I/A-I | 129 | — |
| FFyOC-I | 3 | UD2-IFM prácticas y UD1-OC. Solo 3 h teóricas UD1-IFM |
| FM-II | 18 | — |
| I/A-II | 26 | UD4 tiro |
| FFyOC-II | 20 | UD1-OC. Solo UD1-IFM |
| ART | 110 | — |

Las fechas de horas se guardan aparte del roster
(`cefot2_ua_fechas`).

---

## Coincidencias de fechas (Arrestos y Refuerzos)

Hay coincidencia cuando el rango de un alumno **se solapa** (extremos
incluidos) con un refuerzo o un arresto ya fechado de ese mismo alumno.
Los arrestos pendientes de fecha no ocupan calendario.

1. Se mira cada alumno del parte por separado.
2. Quien no choca se queda en el expediente que se está guardando.
3. Quien choca entra en el panel: calendario propio; días ocupados en
   rojo, tachados y no seleccionables.
4. Al confirmar, ese alumno sale del original y recibe un expediente
   nuevo (copia de tipo, fundamento, motivo, medida, autoridad; cambian
   solo las fechas).

Al editar un refuerzo, ese registro no cuenta como choque consigo mismo.

---

## Rebajes, sanciones, consultas y notas

Sin cambio de procedimiento respecto al manual original:

- Rebaje: alumno, fechas, categorías o rebaje total.
- Sanción: parte, medida, expediente; arresto con fechas.
- Consultas: expediente del alumno.
- Notas: cuestionario de inicio de curso / notas.

---

## Servidor

`index.html` sigue ofreciendo modo servidor (`login.html`) y modo local
(`/seccion3.html`). La página de Sección 3 del servidor debe ser **este**
monofichero, no la versión antigua de 786 KB.

El campo de acceso del servidor se llama **Usuario** (lo asigna el súper
administrador). No tiene que ser un DNI.

---

## Relación con el addendum del 07/09/2026

El apartado de coincidencias de este manual es el vigente. El addendum
del 07/09 queda como histórico; no lo borra.
