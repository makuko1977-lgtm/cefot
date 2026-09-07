# Usar el repositorio como el HTML local

La página `seccion3.html` (la de Sección 3 que abres en el navegador) guarda
los datos **en este dispositivo** (`localStorage`). El panel `admin.html` del
servidor guarda en la base de datos y es multiusuario.

Para que el servidor se comporte **igual que el HTML local**:

1. Copia al repo, dentro de `public/`:
   - `public/seccion3.html`
   - `public/shared/xlsx.full.min.js`
   - `public/shared/exceljs.min.js`
   - (`public/shared/pdf-lib.min.js` ya está en el repositorio)

   Alternativa de un solo archivo: `public/seccion3_completo.html`
   (el HTML original con las librerías incrustadas).

2. Arranca el servidor:

   ```bash
   npm install
   npm start
   ```

3. Abre `http://localhost:3000/seccion3.html`

   Ahí tienes el mismo programa: roster, rebajes, sanciones, refuerzos,
   actividades, consultas, cuestionario de notas, copia de seguridad,
   fotos y PDFs. Los datos se recuerdan en ese navegador, como cuando
   abrías el archivo en local.

`/login.html` sigue siendo el acceso multiusuario (jefe de sección →
`/admin.html`, instructor → `/instructor.html`).
