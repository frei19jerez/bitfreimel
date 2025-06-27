self.addEventListener('install', (event) => {
  console.log('📦 Service Worker instalado');

  event.waitUntil(
    caches.open('bitfreimel-cache').then((cache) => {
      return cache.addAll([
        '/',                             // raíz
        '/index.html',                   // página principal
        '/css/styles.min.css',          // tu estilo
        '/script/script.js',            // tu JS principal
        '/script/service-worker.js',    // este mismo archivo
        '/imagenes/icon-192.png',       // íconos PWA
        '/imagenes/icon-512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
