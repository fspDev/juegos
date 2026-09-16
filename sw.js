/* ==========================================================================
   Service worker — la app arranca aunque el servidor local no esté.

   Estrategia: stale-while-revalidate. Se responde al instante desde el caché
   y en paralelo se relee el archivo del disco para la próxima vez. Así una
   edición en prizes.js aparece sola: editás, reiniciás el equipo dos veces
   (ver README) y ya está.
   ========================================================================== */

const CACHE_NAME = 'juegos-premios-v4';

const ASSETS = [
  'index.html',
  'style.css',
  'app.js',
  'prizes.js',
  'slot.js',
  'boxes.js',
  'kiosk.js',
  'manifest.json',
  'icon.svg',
  'LOGOS/TRIDEX.svg',
  'LOGOS/LH3.svg',
  'LOGOS/SURFADEX.svg',
  'LOGOS/VIODEX.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function staleWhileRevalidate(request, cacheKey) {
  const key = cacheKey || request;
  return caches.open(CACHE_NAME).then((cache) =>
    cache.match(key, { ignoreSearch: true }).then((cached) => {
      const fresh = fetch(new Request(key instanceof Request ? key.url : key, { cache: 'reload' }))
        .then((res) => {
          if (res && res.ok && res.type === 'basic') cache.put(key, res.clone());
          return res;
        })
        .catch(() => null);

      return cached || fresh.then((res) => res || Response.error());
    })
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(req, 'index.html'));
    return;
  }

  event.respondWith(staleWhileRevalidate(req));
});
