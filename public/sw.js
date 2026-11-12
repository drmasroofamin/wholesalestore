const CACHE = 'grain-good-v3';
const ASSETS = [
  '/',
  '/icon.svg',
  '/harvest.webp',
  '/products/rice.webp',
  '/products/atta.webp',
  '/products/dal.webp',
  '/products/oil.webp',
  '/products/moong.webp',
  '/products/sugar.webp',
  '/products/millet.webp',
  '/products/chana.webp',
  '/products/biscuit.webp',
];
self.addEventListener('install', (event) =>
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))),
);
self.addEventListener('activate', (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('grain-good-') && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      ),
  ),
);
self.addEventListener('fetch', (event) => {
  const u = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    u.origin !== location.origin ||
    u.pathname.startsWith('/api/') ||
    u.pathname.startsWith('/admin') ||
    event.request.headers.get('RSC')
  )
    return;
  if (!ASSETS.includes(u.pathname) && !u.pathname.startsWith('/_next/static/')) return;
  event.respondWith(
    fetch(event.request)
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(event.request).then((r) => r || Response.error())),
  );
});
