const CACHE_NAME = 'bitfreimel-cache-v3';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.min.css',
  '/script/script.js',
  '/imagenes/icon-192.png',
  '/imagenes/icon-512.png'
];

// 🟢 Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// 🟢 Activación
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 🟥 EXCLUSIÓN: NO TOCAR PETICIONES DE API / WEBSOCKET / BINANCE
function esPeticionDeDatos(url) {
  return (
    url.includes('binance') ||
    url.includes('api') ||
    url.includes('fapi') ||
    url.includes('klines') ||
    url.includes('ticker') ||
    url.includes('stream')
  );
}

// 🟦 Fetch
self.addEventListener('fetch', (event) => {

  const url = event.request.url;

  // ⛔ No interceptar precios, velas ni APIs dinámicas
  if (esPeticionDeDatos(url)) {
    return; // que vaya directo a la red
  }

  // ⛔ No cachar AdSense
  if (url.includes('adsbygoogle') || url.includes('g.doubleclick.net')) {
    return;
  }

  // ⛔ Solo GET
  if (event.request.method !== 'GET') {
    return;
  }

  // 🟢 Cache First con fallback a red
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(resp => {
          // Cachear solo respuestas estáticas
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() =>
          new Response('⚠️ Sin conexión.', {
            headers: { 'Content-Type': 'text/plain' }
          })
        );
    })
  );
});
