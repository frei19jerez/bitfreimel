const CACHE_NAME = 'bitfreimel-cache-v2';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.min.css',
  '/script/script.js',
  '/imagenes/icon-192.png',
  '/imagenes/icon-512.png'
];

// 🟢 INSTALACIÓN
self.addEventListener('install', (event) => {
  console.log('📦 Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📁 Archivos cacheados:', FILES_TO_CACHE);
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ⚙️ ACTIVACIÓN — limpia cachés viejos automáticamente
self.addEventListener('activate', (event) => {
  console.log('⚙️ Activando nuevo Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('🧹 Borrando caché vieja:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// 🌐 INTERCEPTA PETICIONES
self.addEventListener('fetch', (event) => {
  // Evita interferir con AdSense o solicitudes POST
  if (event.request.method !== 'GET' || event.request.url.includes('adsbygoogle.js')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // 🔁 Respuesta desde caché
        return cachedResponse;
      }

      // 🌎 Si no está en caché, intenta desde la red
      return fetch(event.request)
        .then(networkResponse => {
          // Guarda en caché las respuestas exitosas (solo GET)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // 🛑 Si no hay conexión, muestra mensaje offline
          return new Response('⚠️ Sin conexión. Revisa tu red.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
    })
  );
});
