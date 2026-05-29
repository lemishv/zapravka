/* Service worker для «Заправки».
   Стратегія:
   - HTML (сама сторінка): network-first — щоб оновлення з GitHub Pages
     підхоплювались одразу при наявності мережі, а офлайн бралась з кешу.
     Це прибирає звичну проблему «оновив файл, а старе тримається в кеші».
   - Решта (іконки, шрифти, manifest): cache-first — швидко й працює офлайн.
   Щоб змусити оновлення кешу — змінюй номер версії нижче. */
const CACHE = 'zapravka-v3';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || req.destination === 'document';

  if (isHTML) {
    // network-first
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // cache-first для статики й шрифтів
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const sameOrigin = url.origin === self.location.origin;
        const isFont = url.host.indexOf('gstatic') !== -1 || url.host.indexOf('googleapis') !== -1;
        if (res && res.ok && (sameOrigin || isFont)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
