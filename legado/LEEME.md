# Versiones retiradas (no se publican)

Estas páginas ya no están en `public/`, así que el servidor no las sirve.

| Fichero | Qué era | Por qué se retira |
|---|---|---|
| `seccion3.html` | Pantalla del jefe de sección que guardaba los datos en el navegador (`localStorage`), con botones manuales «Traer del servidor» / «Publicar en servidor». | El jefe de sección trabaja ahora en `public/admin.html`, que guarda directamente en el servidor. |
| `seccion3_26_trabajos_por_alumno.html` | Copia casi idéntica de `seccion3.html` (29 líneas de diferencia). | Duplicado. |
| `copia.html` | Ayuda para pasar copias entre el HTML local y el servidor. | Ya no hay HTML local. |
| `usuarios.html` | Alta de jefes de pelotón para la versión local. Mostraba nombres sin escapar (riesgo de inyección de código). | `admin.html` tiene su propia pestaña Usuarios. |
| `HANDOFF-HORAS-UA.md` | Instrucciones para añadir la pestaña «Horas UA» a `seccion3.html`. | La pestaña ya está integrada en `admin.html`. |
| `HANDOFF-MASTER-HTML.md` | Notas internas sobre la versión canónica de `seccion3.html`. | `seccion3.html` está retirado. Además, en `public/` estas notas se publicaban en la web. |

Se conservan solo como referencia. Si en algún momento hiciera falta una herramienta sin conexión, se puede abrir `seccion3.html` directamente desde el disco.
