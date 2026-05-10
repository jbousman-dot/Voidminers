// Network-first service worker: always fetch fresh, fall back to cache for offline.
// Cache version is auto-incremented on each deploy via the build timestamp.
const CACHE = 'voidminers-v3';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete all old caches
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first: try network, cache the response, fall back to cache if offline
  e.respondWith(
    fetch(e.request).then(res => {
      // Cache successful responses for offline use
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => {
      // Offline fallback
      return caches.match(e.request);
    })
  );
});
