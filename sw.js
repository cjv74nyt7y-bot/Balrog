// Caches the whole game on first visit so it plays with no connection.
// Bump VERSION whenever a file below changes so players get the update.
const VERSION = 'balrog-v2';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './fonts/fonts.css',
  './fonts/alegreya-sans-400.woff2',
  './fonts/alegreya-sans-500.woff2',
  './fonts/alegreya-sans-700.woff2',
  './fonts/im-fell-english-sc-400.woff2',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first, then network; a fresh copy of the page is fetched in the background when online.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(hit => {
      const fetched = fetch(event.request).then(res => {
        if (res && res.ok && new URL(event.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(VERSION).then(cache => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fetched;
    })
  );
});
