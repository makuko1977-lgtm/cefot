# Documentación de Sección 3

- **[Manual de usuario (PDF)](Manual_usuario_CEFOT2.pdf)** — jefe de sección, jefe de pelotón, capitán de compañía (incluidos los arrestos) y jefe de estudios; índice con enlaces (18/11/2026, con las novedades de la v48)
  Se genera desde [`manual_fuente/`](manual_fuente/) con `NODE_PATH=$(npm root -g) node docs/manual_fuente/generar_pdf.js`: para cambiar el manual, edita `manual_fuente/manual.html` (los apartados, figuras e índice se numeran solos) y vuelve a generarlo.

- [CHANGELOG](CHANGELOG_seccion3.md) — actualizado 09/09/2026
- [Manual](MANUAL_seccion3.md) — actualizado 09/09/2026
- [Addendum histórico 07/09/2026](MANUAL_seccion3_addendum_2026-09-07.md)

HTML local: `legado/seccion3.html` (ver `legado/LEEME.md`). En el servidor,
el jefe de sección trabaja en `public/admin.html`.
