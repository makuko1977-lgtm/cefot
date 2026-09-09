# CHANGELOG — Sección 3 (CEFOT-2 / BAL 3.ª CÍA)

Registro de cambios de `seccion3.html` / `seccion3_22_coincidencia_fechas.html`.

---

## 2026-09-09 — Horas UA, recuento filtrado y filtros combinados (Y)

### Resumen

El monofichero canónico (3 146 957 bytes) queda en `public/seccion3.html` y
en `public/seccion3_22_coincidencia_fechas.html` (idénticos). Commit
`d03ef1c`.

### Pestaña Horas UA

- Nueva pestaña **Horas UA** junto a Notas.
- Catálogo por fases FFMG / FFE, sin ciclo ni convocatoria.
- Selector de módulo en desplegable (no buscador de texto).
- Cada hora teórica (T) o práctica (P) tiene fecha; si falta, alarma.
- Persistencia en `localStorage` con la clave `cefot2_ua_fechas`.
- Exclusiones ya aplicadas en el catálogo:
  - FFMG FFyOC-I: solo UD1-IFM, **3 h** teóricas.
  - FFE I/A-II: UD1–UD3, **26 h** (sin UD4 tiro).
  - FFE FFyOC-II: solo UD1-IFM, **20 h** (sin UD1-OC).
- Totales: FFMG 212 h (80+129+3) · FFE 174 h (18+26+20+110).

### Roster: filtros y cuadros

- Pelotón y Destino (columna DESTINO; p. ej. GACALEG) se combinan con **Y**.
- **Filtros avanzados:** sexo (H/M) y situación (con rebaje vigente,
  sin rebaje vigente, con sanción).
- Los cuadros **Alumnos** y **Hombres / Mujeres** cuentan solo el recorte.
- Fórmula visible: `Cruce (Y): Pelotón 1 ∩ GACALEG → n alumnos · H / M`.
- La búsqueda de texto se suma también con Y; dentro del buscador las
  columnas van con O (nombre o DNI o número).
- Botón **Limpiar filtros** y chips del recorte activo.

### Qué no cambia

Cadetes, rebajes, sanciones, refuerzos, actividades, consultas, notas y
el panel de coincidencia de fechas (07/09/2026) siguen igual.

---

## 2026-09-07 — Coincidencias de fechas por alumno (Arrestos y Refuerzos)

El aviso de coincidencias deja de ser un diálogo único «Aceptar / Cancelar»
sobre la fecha del expediente completo. Pasa a resolverse **alumno a alumno**,
con calendario propio, y puede **separar** a quienes tienen conflicto en
expedientes nuevos e independientes.

### Interfaz

- Si al guardar un **Arresto** o un **Refuerzo** las fechas solapan con un
  arresto o refuerzo ya existente de alguno de los alumnos del parte, se
  abre el panel de resolución de coincidencias.
- Cada alumno afectado tiene **su propio calendario**.
- Los días ocupados se muestran en **rojo**, **tachados** y no son seleccionables.
- Se puede asignar una fecha distinta a cada alumno.
- Quien no tiene conflicto permanece en el expediente original.
- Cada alumno separado obtiene un expediente nuevo e independiente.

### Detección

Cruce de rangos inclusive (`rangosSolapan`) entre refuerzos y sanciones
con medida Arresto ya fechada (`arrestoPendiente` no cuenta).

---

## 2026-09-03 — Hito previo (línea monofichero)

Aviso clásico de coincidencia: aceptar o cancelar la misma fecha para
todo el expediente.

---

## Ficheros

| Fichero | Uso |
|---|---|
| `public/seccion3.html` | Página canónica (modo local y la que debe servir el servidor) |
| `public/seccion3_22_coincidencia_fechas.html` | Copia idéntica |
| `docs/CHANGELOG_seccion3.md` | Este registro |
| `docs/MANUAL_seccion3.md` | Manual de uso actualizado |
