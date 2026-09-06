# Publicar CEFOT en App Store Connect

Apple no deja que yo pulse «Enviar a revisión» por ti. Hace falta tu cuenta de desarrollador, un Mac con Xcode y, en este caso, criterio del CIS: la app trata DNI, fotos y expedientes disciplinarios.

## Lo que debes usar (y lo que no)

| Canal | ¿Sale en la búsqueda de la App Store? | ¿Sirve para la unidad? |
|---|---|---|
| App Store **pública** | Sí, cualquiera en el mundo puede instalarla | **No recomendable.** Un civil o un alumno podría descargarla. El CIS suele no autorizar este tipo de datos en un producto público. |
| App Store **no listada** (unlisted) | No. Solo quien tenga el enlace | **La opción práctica.** Se instala desde la App Store (icono normal, actualizaciones, TestFlight) pero no aparece al buscar «CEFOT». |
| Custom App / Apple Business Manager | No | Ideal si la unidad tiene ABM. |
| Solo tu iPhone (firma gratuita) | No | Caduca a los 7 días. |

Pedido: «estar en la App Store, no solo en mi iPhone» → **app no listada** + TestFlight.

## Requisitos que no se pueden saltar

1. **Apple Developer Program** (99 USD / año) en https://developer.apple.com/programs/
2. **Mac con Xcode 16+**
3. **Servidor en HTTPS** (Render, VPS, institucional)
4. **URL de privacidad** ya incluida: `/privacidad.html`
5. **Autorización del CIS** de la unidad

## Riesgo de rechazo (directriz 4.2)

Apple rechaza apps que son «una web dentro de un WebView». El proyecto ahora tiene login nativo, compartir PDF nativo, cámara/galería y `PrivacyInfo.xcprivacy`.

En las notas para revisión explica que es una herramienta interna, que las cuentas las crea un administrador (no hay registro público) y que pides distribución **unlisted**.

## Pasos

1. Activa el Developer Program y espera la activación.
2. App Store Connect → Apps → Nueva app (iOS, español, bundle `es.cefot.app`).
3. Privacidad: `https://TU-SERVIDOR/privacidad.html`
4. Cifrado: solo HTTPS (`ITSAppUsesNonExemptEncryption = NO`).
5. Etiquetas de privacidad: Nombre, ID de usuario, Fotos, Contenido del usuario, Información sensible. Sin tracking.
6. Disponibilidad: **Unlisted App**.
7. Capturas con datos ficticios. Nunca partes reales.
8. Notas para revisión: usuario instructor de prueba.
9. Xcode → Product → Archive → App Store Connect.
10. TestFlight primero; luego enviar a revisión.

## Textos

**Nombre:** CEFOT-2

**Subtítulo:** Gestión de personal de sección

**Descripción:**
CEFOT-2 es una herramienta interna para la gestión de personal de sección: roster, partes, amonestaciones verbales con firma, rebajes y refuerzos.

El acceso es restringido. Las cuentas las crea un administrador de la unidad; no existe registro público.

## Lo que yo no puedo hacer

- Pagar la cuenta de Apple.
- Enviar la app a revisión desde esta conversación.
- Garantizar la aprobación de Apple.
- Sustituir el visto bueno del CIS.
