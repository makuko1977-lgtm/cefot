/* CEFOT-2 — caché del envoltorio (no de la API ni de datos personales). */
var CACHE = "cefot-shell-v1";
var SHELL = [
  "/login.html",
  "/shared/app.css",
  "/manifest.webmanifest",
  "/shared/icon.svg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  var url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;

  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && url.pathname.indexOf("/shared/") === 0) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || caches.match("/login.html");
      });
    })
  );
});
