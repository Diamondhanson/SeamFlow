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

// Holds images handed to us by the OS share sheet, between the POST the browser
// makes and the moment the app boots and comes asking. Memory, not a cache
// entry: the handoff is measured in milliseconds and these can be large.
let sharedImages = [];
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
  const reqUrl = new URL(req.url);

  // ── Web Share Target ─────────────────────────────────────────────────────
  //
  // The manifest points the OS share sheet at POST /share-target. A static SPA
  // cannot receive a POST — there is no server to handle it — so we intercept
  // it here, keep the files, and redirect to a normal GET route the app can
  // render. The app then asks for them via the message channel below.
  //
  // Chrome on Android only, and only once installed. iOS Safari has no Web
  // Share Target; that platform needs the native share extension instead.
  if (req.method === 'POST' && reqUrl.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        try {
          const form = await req.formData();
          sharedImages = form.getAll('images').filter((f) => f && f.size > 0);
        } catch {
          sharedImages = [];
        }
        // 303 so the browser switches the POST to a GET on the way through.
        return Response.redirect('/share-receive?src=web', 303);
      })(),
    );
    return;
  }

  if (req.method !== 'GET') return;

  const url = reqUrl;
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

// The app asks for whatever the share sheet just handed us. Answered once and
// then dropped — a second boot must not resurrect an old share.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'seamflow:take-shared-images') return;
  const files = sharedImages;
  sharedImages = [];
  event.ports[0]?.postMessage({ files });
});
