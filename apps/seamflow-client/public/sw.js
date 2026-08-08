// ============================================================================
// SeamFlow service worker — app-shell caching only.
//
// Deliberately conservative: we cache the built static assets so the app opens
// fast and survives a flaky network, and we NEVER cache API responses. Data
// offline is already handled by the react-query persist cache, and caching API
// calls here would risk serving a tailor stale orders/measurements.
//
// Strategy:
//   - navigations  → network-first, fall back to the cached shell (SPA offline)
//   - static build assets (/_expo/, /assets/, icons) → cache-first
//   - everything else (API, Supabase, storage) → straight to the network
// ============================================================================

const CACHE = 'seamflow-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only ever touch our own origin — API, Supabase and image storage go direct.
  if (url.origin !== self.location.origin) return;

  // App navigations: try the network so deploys land immediately, fall back to
  // the cached shell when offline (keeps the SPA usable).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((r) => r ?? Response.error())),
    );
    return;
  }

  // Hashed build output + icons: cache-first, they're immutable.
  const isStatic =
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/assets/') ||
    /\.(png|jpg|jpeg|svg|ico|ttf|woff2?|js|css)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
