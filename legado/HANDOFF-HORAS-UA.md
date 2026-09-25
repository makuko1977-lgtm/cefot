# Handoff · pestaña Horas UA → `public/seccion3.html`

Pieza lista para la conversación **master HTML**. **No sustituye** `seccion3.html`: solo añade una pestaña.

Archivo fuente: [`public/horas-ua.html`](../public/horas-ua.html) (copia de `CEFOT2-Horas-UA.html`, ~55 KB, `file://`, sin módulos ES).

## Tres exclusiones (ya recortadas en el catálogo)

| Fase | Módulo | Fuera | Queda |
|---|---|---|---|
| FFMG | FFyOC-I | UD2-IFM (30 P) y UD1-OC (38 P) | UD1-IFM, 3 h teóricas |
| FFE | I/A-II | UD4 tiro (14 P) | UD1–UD3, 26 h |
| FFE | FFyOC-II | UD1-OC (12 P) | UD1-IFM, 20 h |

Totales: FFMG 212 h (80+129+3) · FFE 174 h (18+26+20+110).

## Cómo implantar

1. Copiar `<style id="cefot2-horas-ua-css">` al CSS de `seccion3.html` (prefijar selectores si chocan con estilos existentes; IDs `cefot2-horas-ua-*` son estables).
2. Añadir botón de pestaña «Horas UA» que muestre `#pestana-horas-ua` y oculte el resto, igual que cadetes / sanciones / consultas / notas.
3. Copiar `<section id="pestana-horas-ua">` al cuerpo.
4. Copiar los dos scripts al final, **sin** módulos ES:
   - `<script id="cefot2-horas-ua-catalogo" type="application/json">`
   - `<script id="cefot2-horas-ua-js">`
5. **No mostrar ciclo ni convocatoria** (siguen en datos internos, no en UI).
6. El selector de módulo es un **desplegable**, no un buscador de texto.

## Contrato de datos

- `localStorage` key: `cefot2_ua_fechas`
- IDs de hueco: `${uaId}:T:n` / `${uaId}:P:n` (medias horas = un hueco de 0,5)
- Fecha nativa `YYYY-MM-DD` por hueco; sin fecha → alarma
- No hay ciclo en la interfaz

## Qué no tocar

Cadetes, rebajes, sanciones, consultas y notas de `seccion3.html` quedan como están.

Kit Windows: más adelante incrustar este HTML (o el `seccion3.html` ya fusionado) y firmar el instalador.
