# HTML en modo local (no se publica en el servidor)

`seccion3.html` es la versión **local** de la gestión de la sección: se abre
con doble clic desde el disco y guarda los datos solo en ese navegador. El
servidor ya no la publica; en el servidor el jefe de sección trabaja en
`public/admin.html`.

## Pasar datos del servidor al HTML local

Mientras el servidor no sea accesible desde la intranet:

1. En el servidor (`admin.html`) pulsa **«Exportar copia»**. Se descarga un
   archivo `CEFOT2_copia_<compañía>-<sección>_<fecha>.json`.
2. En el HTML local pulsa **«Importar copia del servidor (añadir)…»** y elige
   ese archivo.

La importación **solo añade** lo que todavía no existe en el HTML local
(alumnos por número; sanciones, rebajes, refuerzos y actividades por su
identificador interno). **Nunca sustituye ni borra** nada. Se puede importar
la misma copia varias veces sin duplicar registros.

Avisos:

- Si una sanción del servidor trae un **número de expediente** que en local ya
  usa otro parte, se añade igualmente y se muestra un aviso con esos números
  para revisarlos.
- Si un registro ya importado se modifica después en el servidor, ese cambio
  **no** llega al HTML local (no se sobrescribe nunca): hay que corregirlo a
  mano en local.

«Importar copia de seguridad…» (copias propias del HTML local) también
funciona solo añadiendo, y si se le da por error un archivo exportado del
servidor, lo pasa automáticamente a la importación del servidor.

Antes de sustituir el archivo `seccion3.html` del ordenador del trabajo por
una versión nueva, haz una copia de seguridad desde el HTML actual.
