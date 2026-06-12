// sw.js — service worker dla Kalornika
const CACHE = 'kalornik-v11';
const ASSETS = [
  './',
  './index.html',
  './src/styles.css?v=10',
  './src/app.js?v=10',
  './src/storage.js?v=10',
  './src/ui.js?v=10',
  './src/backup.js?v=10',
  './src/products.js?v=10',
  './src/scanner.js?v=10',
  './src/pwa.js?v=10',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // API Open Food Facts i biblioteka ZXing mają iść z sieci, żeby nie mieszać cache aplikacji z danymi zewnętrznymi.
  if (url.origin !== self.location.origin) {
    e.respondWith(fetch(req));
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req)
      .then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }))
  );
});
