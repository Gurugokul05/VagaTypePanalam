/*
 * VangaTypePanalam service worker
 *
 * Strategy (deliberately conservative):
 *  - Navigations: network-first, fall back to last-good cached page when offline.
 *  - Immutable static assets: stale-while-revalidate (cache-first + background refresh).
 *  - /api/* : never intercepted — sync/auth must always hit the server.
 */

const CACHE_VERSION = 'vanga-v2';
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const MAX_PAGES = 20;

const ASSET_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
  /\/badges\//,
  /\/logo-theme\//,
  /\/data\//,
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !n.startsWith(CACHE_VERSION)).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(request, fresh.clone());
            trimCache(PAGE_CACHE, MAX_PAGES);
          }
          return fresh;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            '<h1>You are offline</h1><p>Reconnect to load this page. Your typing progress is saved locally.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          );
        }
      })()
    );
    return;
  }

  if (ASSET_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => undefined);
        return cached || (await refresh) || Response.error();
      })()
    );
  }
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}
