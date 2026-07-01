// Математически справочник — Service Worker
// Версия на кеша — увеличи при промяна на файловете
const CACHE_NAME = 'math-handbook-v19';

// Файлове за кеширане при инсталация
const PRECACHE_URLS = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './three.min.js',
  './icons/logo-full.png',
  './icons/logo-mark.png',
  './icons/home-hero.jpg'
];

// --- Инсталация ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// --- Активиране — изтрива стари кешове ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// --- Съобщение от страницата: активирай новата версия веднага ---
self.addEventListener('message', event => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

// --- Fetch стратегия ---
// Основните файлове (HTML, CSS, JS): network-first — винаги взима свежа версия,
// кешът е резервен само при офлайн. Така обновяванията се виждат веднага.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = event.request.url;
  const isCore = url.endsWith('.js') || url.endsWith('.css') ||
                 url.endsWith('.html') || url.endsWith('/') ||
                 event.request.mode === 'navigate';

  if (isCore) {
    // Network-first
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then(c => c || caches.match('./index.html'))
      )
    );
  } else {
    // Останалите (икони и т.н.): cache-first
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          }
          return response;
        })
      )
    );
  }
});
