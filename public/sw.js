/* Hand-rolled service worker.
   - Precache the entire app shell (schedule data is inlined in index.html),
     so a single successful load makes the app fully offline-capable.
   - Stale-while-revalidate on navigations: instant load from cache, fetch in
     the background; a changed deploy installs as a *waiting* worker and the
     app shows an "updated schedule" toast. Never auto-activates mid-use.
   __BUILD_HASH__ is stamped by scripts/build.mjs from the built content. */

const CACHE = 'herrang-__BUILD_HASH__';
const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'schedule.json',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  // clients.claim() is what makes the post-toast SKIP_WAITING handover fire
  // controllerchange in open pages. It also fires on first install — the app
  // only reloads on controllerchange after the user tapped the update toast.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Navigations serve the cached shell immediately and revalidate in the
  // background — the update lands as a waiting SW, surfaced by the toast.
  const cacheKey = req.mode === 'navigate' ? 'index.html' : req;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(cacheKey);
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(cacheKey, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached ?? refresh;
    })
  );
});
