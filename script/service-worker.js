const CACHE_NAME = 'bitfreimel-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.min.css',
  '/script/script.js',
  '/script/service-worker.js',
  '/imagenes/icon-192.png',
  '/imagenes/icon-512.png'
];

// INSTALACIÓN
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// ACTIVACIÓN (limpia cachés viejos)
self.addEventListener('activate', (event) => {
  console.log('⚙️ Activando SW...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('🧹 Eliminando caché vieja:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// FETCH
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // ⏪ Respuesta desde caché
      }
      return fetch(event.request) // 🌐 Desde la red
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          // 🛑 Modo offline (opcional: muestra HTML offline personalizado)
          return new Response("Sin conexión", {
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});
