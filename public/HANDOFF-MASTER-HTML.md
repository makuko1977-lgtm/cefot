# Handoff · conversación master HTML

Archivo canónico listo para GitHub y para el servidor (byte a byte el mismo):

- `public/seccion3.html`
- `public/seccion3_22_coincidencia_fechas.html`

SHA-256 (16 hex): `06b5f252ed9b6bcc` · 3 146 957 bytes.

Es un **monofichero** (`file://`): xlsx y pdf-lib van incrustados. No depende de `/shared/`.

## Qué trae (ya implantado, no volver a fusionar a mano)

1. Pestaña **Horas UA** (catálogo recortado: FFyOC-I 3 h, I/A-II 26 h, FFyOC-II 20 h). Sin ciclo/convocatoria. Desplegable de módulo.
2. Roster: filtros Pelotón + Destino + avanzados (sexo, rebaje vigente, sanción) se combinan con **Y**. Los cuadros Alumnos y Hombres/Mujeres cuentan el recorte.
3. Fórmula de cruce: `Cruce (Y): Pelotón 1 ∩ GACALEG → n alumnos · H / M`.
4. Coincidencia de fechas (`rangosSolapan`) intacta.

## Qué tiene que hacer la conversación master

1. Usar **este** `public/seccion3.html` como la página de Sección 3 (modo local y la que sirve el servidor).
2. **No** sustituir por la versión de 786 KB.
3. `public/index.html` (acceso servidor/local) se queda. El botón «Modo local» ya apunta a `/seccion3.html`.
4. No reimplantar Horas UA: ya está dentro.

Prompt corto:

> Sustituye `public/seccion3.html` y `public/seccion3_22_coincidencia_fechas.html` por los de este commit. Deben ser idénticos al monofichero (3 146 957 bytes). No reimplantes Horas UA. No toques `index.html` ni el modo servidor (`login.html`).
