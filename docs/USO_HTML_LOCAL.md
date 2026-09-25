# Versión local (retirada)

Hasta septiembre de 2026 el jefe de sección trabajaba en `seccion.html`, que
guardaba los datos en el navegador (`localStorage`) y solo se sincronizaba con
el servidor pulsando «Traer del servidor» / «Publicar en servidor».

Desde ahora **todos los perfiles trabajan contra el servidor**:

| Perfil | Pantalla tras iniciar sesión |
|---|---|
| Jefe de sección | `/admin.html` |
| Jefe de pelotón | `/instructor.html` |
| Capitán de compañía | `/capitan.html` → al entrar en una sección, `/admin.html` |
| Súper Administrador | `/superadmin.html` |
| Jefe de estudios | `/estudios.html` |

`seccion.html` y las páginas asociadas se han movido a `legado/` (ver
`legado/LEEME.md`) y el servidor ya no las publica.

Para probar en local:

```bash
npm install
npm start          # http://localhost:3000/login.html
npm test           # pruebas automáticas
```
