const CACHE_NAME = 'ebook-ngan-offline-v19';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never cache live TTS or API calls
  if (req.url.includes('translate.googleapis.com') || req.url.includes('translate.google.com') || req.url.includes('generativelanguage.googleapis.com') || req.url.includes('api.openai.com') || req.url.includes('api.elevenlabs.io')) {
    return;
  }

  // Network-First for HTML navigation so updates on GitHub Pages apply immediately on reload (offline falls back to cache)
  const isHtml = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html') || req.url.endsWith('/index.html') || req.url.endsWith('/');
  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const copy = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return networkResp;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkResp) => {
          if (networkResp && (networkResp.status === 200 || networkResp.type === 'opaque')) {
            const copy = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return networkResp;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
