# Servidor y HTML local

Todos los perfiles trabajan **contra el servidor**:

| Perfil | Pantalla tras iniciar sesión |
|---|---|
| Jefe de sección | `/admin.html` |
| Jefe de pelotón | `/instructor.html` |
| Capitán de compañía | `/capitan.html` → al entrar en una sección, `/admin.html` |
| Súper Administrador | `/superadmin.html` |
| Jefe de estudios | `/estudios.html` |

El HTML local (`legado/seccion3.html`) ya no lo publica el servidor. Se abre
con doble clic desde el disco y guarda los datos solo en ese navegador.

Para pasar datos del servidor al HTML local (por ejemplo, mientras el
servidor no sea accesible desde la intranet) se descarga la copia de
seguridad en `admin.html` y se carga en el HTML local con
**«Importar copia del servidor (añadir)…»**. La importación solo añade lo
que falta y nunca sustituye ni borra nada. Detalles en `legado/LEEME.md`.

Para probar en local:

```bash
npm install
npm start          # http://localhost:3000/login.html
npm run demo       # igual, con datos ficticios
npm test           # pruebas automáticas
```
