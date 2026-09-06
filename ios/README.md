# CEFOT · App nativa iOS

Proyecto Xcode listo para instalar en un iPhone. Es una app nativa (SwiftUI + WKWebView) que habla con el mismo servidor del repositorio: login, roles, fotos, firma táctil y PDF.

No se publica sola en el App Store. Hace falta un Mac con Xcode y el iPhone. La cuenta de desarrollador de Apple gratuita basta para instalarla en *tu* teléfono.

## 1. Requisitos

- Mac con Xcode 16 o superior
- iPhone con iOS 16 o superior
- Cable USB (o la misma red Wi-Fi para instalar por red)
- El servidor CEFOT desplegado (Render, VPS, o `npm start` en la red local)

## 2. Configurar la URL del servidor

Abre `ios/CEFOT/Config.swift` y cambia `defaultServerURL` por la URL real, **sin barra final**:

```swift
static let defaultServerURL = "https://cefot-vxs6.onrender.com"
```

Si el servicio gratuito de Render está dormido, la primera carga puede tardar ~1 minuto. La app reintenta sola.

También se puede cambiar la URL desde la propia app (botón ⚙ en la esquina, o si falla la conexión).

Para probar contra el Mac:

```swift
static let defaultServerURL = "http://192.168.1.23:3000"
```

(Usa la IP LAN del ordenador, no `localhost`: en el iPhone `localhost` es el propio teléfono.)

## 3. Abrir y firmar el proyecto

1. Copia la carpeta `ios` al Mac (o clona el repo).
2. Abre `ios/CEFOT.xcodeproj` con Xcode.
3. Arriba, selecciona el target **CEFOT** → pestaña **Signing & Capabilities**.
4. Marca **Automatically manage signing**.
5. En **Team**, elige tu Apple ID (Xcode → Settings → Accounts → añadir Apple ID si no está).
6. Cambia el **Bundle Identifier** si Xcode dice que está ocupado, por ejemplo `es.cefot.seccion3.tuapellido`.

## 4. Instalar en el iPhone

1. En el iPhone: Ajustes → Privacidad y seguridad → Modo desarrollador → activar (iOS 16+).
2. Conecta el iPhone al Mac y desbloquéalo. Confía en el ordenador si lo pide.
3. En Xcode, elige tu iPhone en la barra de destinos (no el simulador).
4. Pulsa ▶ Run.
5. La primera vez el iPhone bloquea la app: Ajustes → General → Administración de VPN y dispositivos (o Privacidad y seguridad → Desarrollador) → confía en tu Apple ID.

A partir de ahí el icono **CEFOT** queda en la pantalla de inicio como cualquier app.

## 5. Permisos que pedirá

- **Cámara**: foto del alumno desde la ficha.
- **Galería**: subir una foto o un adjunto ya existente.

Las cookies de sesión (JWT) se guardan en el WebView: no hay que volver a entrar cada vez, hasta que caduque la sesión del servidor (12 h).

## 6. PDF y amonestaciones

Cuando la web genera un PDF (amonestación verbal firmada, etc.), la app lo intercepta y abre la hoja nativa de compartir: Guardar en Archivos, AirDrop, imprimir, etc.

## 7. Lo que esta app no es

- No es un cliente SwiftUI reescrito pantalla a pantalla (el panel de admin tiene cientos de miles de líneas). Reutiliza la interfaz ya probada del servidor, dentro de un contenedor nativo.
- No se puede enviar al App Store sin cuenta de desarrollador de pago (99 USD/año), revisión de Apple y, en este caso, criterio del CIS de la unidad: maneja datos disciplinarios.

Si más adelante quieres pantallas 100 % nativas (login + partes del instructor en SwiftUI) o un IPA para TestFlight, dímelo y lo montamos encima de este proyecto.
