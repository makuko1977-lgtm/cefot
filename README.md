# CEFOT-2 · BAL/3ª CÍA — Aplicación multiusuario (servidor)

Aplicación web para la gestión de rebajes, refuerzos y sanciones de la sección,
con acceso mediante DNI + contraseña y dos roles de usuario (administrador e
instructor). Sustituye a la versión de un único archivo (`seccion3.html`) en
los casos en que varias personas necesiten introducir datos a la vez desde
distintos dispositivos.

## 1. Qué cambia respecto a la versión de un solo archivo

- Los datos ya no se guardan en el navegador (`localStorage`): se guardan en
  el servidor, en un único fichero `data/data.json`, y todos los usuarios ven
  siempre la información actualizada.
- Hay dos roles:
  - **Administrador**: acceso completo (roster, rebajes, sanciones,
    refuerzos, consultas, generación de PDF, y alta/baja de usuarios).
  - **Instructor**: solo puede buscar un alumno (nombre, apellidos, número y
    pelotón — nada más) y dar de alta una sanción nueva. No puede ver el
    listado de sanciones, rebajes, refuerzos ni el roster completo. Tras
    guardar, solo ve un resumen de confirmación de lo que acaba de registrar,
    no un listado histórico.
  - Todo lo que registra un instructor aparece automáticamente en la pantalla
    del administrador (pestaña Sanciones) en cuanto este cambia de pestaña o,
    como máximo, a los 25 segundos, gracias a una comprobación periódica en
    segundo plano.

### Amonestaciones verbales (con firma táctil)

En "Medida correctora" de una sanción, tanto el instructor como el
administrador pueden elegir **"Amonestación verbal"**. Al guardar el parte:

- Al instructor le aparece un botón **"Firmar y generar documento"** en la
  pantalla de confirmación.
- Al administrador le aparece un botón **"Generar documento"** en la fila
  correspondiente de la pestaña Sanciones.

Ambos abren una pizarra de firma táctil: se le pasa el teléfono o la tablet
al alumno para que firme con el dedo (funciona igual con ratón en un PC).
Al confirmar, se genera y descarga automáticamente el PDF con el formato
"Amonestaciones Verbales" (CEFOT.2 / BAL./3ª CÍA., Nº Protocolo —el número
del alumno—, apellidos, nombre, motivo, autoridad, fecha y la firma
escaneada). La firma queda guardada en el servidor junto al parte, así que
el documento se puede volver a descargar más tarde sin tener que pedirle al
alumno que firme otra vez. Si el expediente tiene varios alumnos, el
documento se genera uno por uno (se elige a quién corresponde antes de
firmar).

El recuadro **MOTIVO** del documento combina, uno debajo del otro, los dos
campos que se rellenan en el formulario: el **fundamento legal** elegido de
la lista (con su letra de apartado, igual que en el desplegable — "a)", "b)"...)
y, debajo, el **motivo de la sanción / descripción de los hechos** escrito a
mano. Ambos campos siguen siendo independientes en el formulario (elegir un
fundamento legal no rellena el motivo por ti, ni al revés), pero en el
documento final aparecen juntos y etiquetados.

### Permisos por instructor

Por defecto, un instructor solo puede dar de alta sanciones y amonestaciones
verbales — eso nunca se puede quitar. Además de eso, el administrador puede
concederle a cada instructor, uno por uno, cualquier combinación de estos
cuatro permisos extra desde la pestaña **Usuarios** (botón **"Editar
permisos"** en la fila del instructor, o al crearlo):

- **Hacer foto del alumno**: puede tomar o subir una foto desde la ficha del
  alumno (cámara del móvil/tablet o archivo). La foto se guarda en la ficha
  general del alumno — el mismo sitio donde la ve el administrador —, así que
  aparece automáticamente en la página principal sin ningún paso adicional.
- **Ver ficha básica del alumno**: además del número, apellidos, nombre y
  pelotón (visibles siempre al buscar a un alumno para un parte), puede ver
  también su sexo, DNI, teléfono y unidad.
- **Adjuntar archivos a la ficha**: puede añadir y eliminar (solo los suyos;
  el administrador puede eliminar cualquiera) archivos PDF o imágenes en la
  ficha del alumno.
- **Consultar rebajes y refuerzos**: puede ver (solo lectura) los rebajes y
  refuerzos ya registrados de cualquier alumno.

Un instructor con al menos uno de estos permisos ve una pestaña adicional
("Ficha del alumno" y/o "Rebajes y refuerzos") en su pantalla; si no tiene
ninguno, su pantalla se queda igual que antes (solo el formulario de partes).
Los permisos se comprueban en el servidor en cada petición — si el
administrador le quita un permiso a un instructor, deja de tener acceso
inmediatamente, sin esperar a que vuelva a iniciar sesión.

### Funciones que siguen sin estar disponibles en esta versión

- Importación masiva de fotos o de respuestas del cuestionario de inicio de
  curso desde archivos (la foto y los adjuntos, uno a uno desde la ficha, sí
  están disponibles — ver arriba).
- Restaurar una copia de seguridad desde un archivo (solo queda la
  **exportación** de copia de seguridad de solo lectura, en Admin).

Si alguna de ellas es necesaria, se puede añadir en una siguiente iteración;
avísame y la incorporamos.

## 2. Requisitos

- Node.js 18 o superior (probado con Node 22).
- No hace falta ninguna base de datos para probarlo en local: los datos se
  guardan en un archivo JSON dentro de la propia carpeta del proyecto. Para
  desplegarlo en un hosting sin disco persistente sí hace falta una base de
  datos Postgres (ver el punto 6 más abajo) — puede ser gratuita.

## 3. Puesta en marcha en local (para probarlo)

```bash
cd server-app
npm install
npm start
```

La primera vez que arranca, si no hay ningún usuario creado, el propio
servidor genera automáticamente una cuenta de administrador y muestra sus
credenciales **por consola** (no en ningún archivo ni en la web):

```
========================================================
 No había ningún usuario: se ha creado un admin inicial.
 DNI:        ADMIN
 Contraseña: xxxxxxxx
 Cámbiala en cuanto entres (Admin > Usuarios).
========================================================
```

Con esas credenciales entra en `http://localhost:3000/login.html`, y **lo
primero que debes hacer es cambiar esa contraseña** desde la pestaña
"Usuarios" (botón "Cambiar contraseña").

## 4. Dar de alta usuarios (instructores u otros administradores)

Solo un administrador puede crear usuarios, desde la pestaña **Usuarios**:
DNI, nombre, contraseña (mínimo 6 caracteres) y rol (instructor o
administrador). Al crear un instructor se le pueden marcar directamente los
permisos extra que necesite (ver "Permisos por instructor" más arriba); más
tarde se pueden cambiar en cualquier momento con "Editar permisos". Desde
ahí también se puede cambiar la contraseña de cualquier usuario o eliminar
su acceso.

Cada usuario debe entrar por la misma dirección (`/login.html`); tras
identificarse, se le redirige automáticamente a la pantalla que le
corresponde según su rol.

## 5. Copia de seguridad

Desde Admin puedes descargar en cualquier momento un archivo JSON con todo
el contenido actual (roster, sanciones, rebajes, refuerzos) desde
`GET /api/admin/backup`. Consérvalo periódicamente como respaldo; no incluye
contraseñas.

### Cerrar curso académico

En la pestaña **Usuarios**, al final, hay un botón **"Cerrar curso…"** para
cuando toca empezar el curso siguiente: vacía sanciones, rebajes y refuerzos
(y reinicia la numeración de expedientes). El roster se conserva por
defecto — solo se vacía si marcas la casilla correspondiente (por ejemplo,
si entra una promoción nueva). Es una acción irreversible, así que el
propio formulario obliga a: descargar antes la copia de seguridad, y
escribir literalmente "CERRAR CURSO" para confirmar. Queda un pequeño
historial (fecha, quién lo hizo y cuántos registros se vaciaron, sin datos
personales) visible la próxima vez que abras ese mismo formulario.

## 6. Publicarlo en un servidor para que varias personas accedan desde fuera

Antes de decidir dónde alojarlo, ten en cuenta que esta aplicación maneja
datos disciplinarios de personal militar: conviene confirmar con el
responsable de seguridad de la información / CIS de la unidad si existe un
servidor institucional donde deba alojarse, o si un alojamiento comercial
está permitido para este tipo de datos. Mientras se resuelve esa cuestión,
la aplicación puede usarse igualmente en red local o con datos de prueba.

### Sobre dónde se guardan los datos (importante)

Por defecto (sin ninguna variable de entorno) los datos se guardan en un
fichero, `data/data.json`, dentro de la propia carpeta del proyecto — así
funciona la puesta en marcha en local del punto 3. Eso solo sirve si el
disco donde vive esa carpeta es persistente (tu propio ordenador, un VPS,
un servidor institucional).

En un hosting gratuito tipo PaaS (Render y similares) el disco normalmente
**no** es persistente: se borra en cada despliegue o reinicio. Para esos
casos la app sabe guardar en una base de datos Postgres en vez de en un
fichero: basta con definir la variable de entorno `DATABASE_URL` (ver
`.env.example`) con la cadena de conexión de una base de datos Postgres —
por ejemplo una gratuita en [Neon](https://neon.com) — y, al arrancar, la
app crea sola la tabla que necesita y empieza a guardar ahí. No hay que
tocar nada más: el resto de la aplicación funciona exactamente igual.

### Opción recomendada para un uso interno sin coste: Render + Neon (gratis)

Es la combinación con menos mantenimiento y menos riesgo de perder datos de
las opciones gratuitas: Render no ofrece disco persistente en su plan
gratuito, pero Neon sí guarda los datos de verdad (su parte gratuita solo
"suspende" el cómputo cuando no se usa, nunca borra lo guardado).

1. **Crea la base de datos (Neon)**: cuenta gratuita en
   [neon.com](https://neon.com) → crea un proyecto → copia la cadena de
   conexión que te dan (empieza por `postgresql://...`).
2. **Sube el código a un repositorio Git** (GitHub, por ejemplo): Render
   despliega a partir de un repositorio.
3. **Crea el servicio (Render)**: cuenta gratuita en
   [render.com](https://render.com) → "New" → "Web Service" → conecta el
   repositorio. Si detecta el `render.yaml` incluido en este proyecto, deja
   casi todo configurado solo (plan gratuito, comandos de instalación y
   arranque); si no, configúralo a mano:
   - Build command: `npm install`
   - Start command: `npm start`
   - Variables de entorno: `DATABASE_URL` (la de Neon), `NODE_ENV=production`,
     `TRUST_PROXY=1`.
4. **Primer arranque**: en los logs del servicio (pestaña "Logs" de Render)
   aparecen el DNI y la contraseña del administrador inicial, igual que en
   local. Entra con ellas en `https://tu-servicio.onrender.com/login.html`
   y cámbiala enseguida desde "Usuarios".

Dos cosas a tener en cuenta con el plan gratuito de Render: el servicio "se
duerme" tras 15 minutos sin visitas y tarda cerca de un minuto en
despertarse con la primera petición (normal para un uso interno ocasional,
molesto si se usa constantemente); y la base de datos gratuita de Neon
incluye 0.5 GB de almacenamiento, de sobra para el roster y los partes,
pero a vigilar si se suben muchas fotos o adjuntos por alumno con el tiempo
— si algún día se queda corto, se puede ampliar en Neon o mover los
adjuntos a un almacenamiento de archivos aparte; avísame cuando toque.

### Otras opciones, si hace falta más control

1. **Un servidor propio (VPS)**: más control y los datos quedan bajo tu
   propia infraestructura, pero tú (o vuestro CIS) os encargáis de
   mantenerlo: actualizaciones, copias de seguridad, certificado HTTPS, etc.
   Al tener disco persistente de verdad, aquí NO hace falta `DATABASE_URL`
   — puede seguir guardando en `data/data.json` como en local.
   - Instala Node.js en el servidor, copia esta carpeta, ejecuta
     `npm install --production` y `NODE_ENV=production npm start`.
   - Se recomienda ponerlo detrás de un proxy con HTTPS (por ejemplo Nginx +
     Let's Encrypt) y arrancarlo con un gestor de procesos como `pm2` o un
     servicio `systemd` para que se reinicie solo si el servidor reinicia.

2. **Servidor institucional / de la propia unidad**: si el CIS dispone de
   infraestructura propia, es la opción más alineada con la normativa
   aplicable a este tipo de datos. El despliegue es equivalente al del VPS
   (punto anterior), pero dentro de la red y bajo la supervisión de dicho
   personal.

En cualquiera de los casos, el enlace que compartirías con los usuarios es
simplemente la URL de `login.html` (por ejemplo
`https://tu-dominio.ejemplo/login.html`, o `https://tu-servicio.onrender.com/login.html`
en Render), y cada uno entra con su DNI y la contraseña que le hayas
asignado.

## 7. Estructura del proyecto

```
server-app/
├── server.js              Arranque del servidor y montaje de rutas
├── render.yaml             Plantilla de despliegue para Render (opcional)
├── .env.example             Variables de entorno soportadas (cópialo a .env en local)
├── lib/
│   ├── db.js               Carga/guardado del almacén de datos: fichero local
│   │                        (data/data.json) o Postgres si hay DATABASE_URL
│   ├── auth.js              Autenticación (JWT en cookie), hashing de contraseñas
│   └── seed.js              Utilidad de línea de comandos para crear un admin
├── routes/                  Endpoints de la API (auth, roster, sanciones, rebajes, refuerzos, consultas, admin)
├── public/
│   ├── login.html            Pantalla de acceso
│   ├── admin.html            Aplicación completa (administrador)
│   ├── instructor.html       Formulario reducido (instructor)
│   └── shared/                CSS y catálogo de faltas/medidas compartidos
└── data/
    └── data.json              Almacén de datos en modo fichero (se crea solo al arrancar; no se usa si hay DATABASE_URL)
```

## 8. Notas técnicas rápidas

- Autenticación mediante cookie httpOnly (JWT, 12h de validez).
- Las contraseñas se guardan siempre con hash (bcrypt), nunca en claro.
- El servidor vuelve a resolver siempre los datos del alumno a partir del
  roster guardado en el servidor (nunca se fía de lo que envíe el
  navegador), y asigna él mismo el número de expediente de cada sanción,
  para que no haya conflictos si varias personas trabajan a la vez.
