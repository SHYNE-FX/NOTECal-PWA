/* NOTECal Service Worker — v1.0.0 */
const CACHE = 'notecal-v1';
const STATIC = [
  './',
  './index.html',
  './manifest.json',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg',
  /* CDN assets cached on first fetch */
];

/* External CDN origins to cache */
const CDN_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdnjs.cloudflare.com',
];

/* ── INSTALL: pre-cache local assets ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: remove old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: cache-first for local/CDN, network-only for APIs ── */
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  /* Skip non-GET and cross-origin non-CDN */
  if (request.method !== 'GET') return;

  const isCDN = CDN_ORIGINS.some(o => request.url.startsWith(o));
  const isLocal = url.origin === self.location.origin;

  if (!isLocal && !isCDN) return;

  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(res => {
        /* Only cache valid responses */
        if (!res || res.status !== 200 || res.type === 'error') return res;

        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(request, clone));
        return res;
      }).catch(() => {
        /* Offline fallback for navigation */
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

/* ── MESSAGE: force update ── */
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
