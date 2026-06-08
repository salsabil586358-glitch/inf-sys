// ═══════════════════════════════════════════════
// SERVICE WORKER — S.I. Bleues
// Cache-first strategy → full offline support
// ═══════════════════════════════════════════════

const CACHE_NAME = 'si-bleues-v1';

// All files to cache on install
const ASSETS = [
  './',
  './si_app.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
];

// External resources to cache (fonts)
const EXTERNAL = [
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Tajawal:wght@400;600;700;800&display=swap',
];

// ── Install: cache all assets ──────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets (must succeed)
      cache.addAll(ASSETS);
      // Cache external fonts (best effort — won't fail install if offline)
      EXTERNAL.forEach(url => {
        fetch(url).then(res => {
          if (res.ok) cache.put(url, res);
        }).catch(() => {});
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first, fallback to network ───
self.addEventListener('fetch', event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache it
      return fetch(event.request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline and not cached — return app shell for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./si_app.html');
        }
      });
    })
  );
});
