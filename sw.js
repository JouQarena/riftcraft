// sw.js — Riftcrafter offline service worker  [CORS artwork cache repair 20260920]
// Once something is downloaded it stays saved: images are served from the
// device cache. Legacy opaque entries are repaired on demand for CORS images.
// Cache names are stable on purpose — updating the site must not wipe saved art.
const APP_CACHE = 'riftcrafter-app-v1';
const DATA_CACHE = 'riftcrafter-data-v1';

// Everything the game needs to run offline (app shell).
const APP_SHELL = [
  './', './index.html', './champion-roll.html',
  './css/page-switcher.css', './js/page-switcher.js',
  './css/style.css',
  './js/app.js', './js/storage.js', './js/share.js', './js/hud.js', './js/sounds.js', './js/randomizer.js',
  './public/frame.webp',
  './public/manifest.webmanifest',
  './public/icon-180.png', './public/icon-192.png', './public/icon-512.png', './public/icon-maskable-512.png',
  './sounds/roll.mp3', './sounds/pick.mp3', './sounds/complete.mp3', './sounds/replay.mp3', './sounds/share.mp3', './sounds/remove.wav'
];

const IMAGE_RE = /\.(png|webp|jpe?g|gif|svg)(\?|$)/i;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    // addAll would fail the whole install if ONE file 404s — use allSettled instead
    await Promise.allSettled(APP_SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // keep ONLY our two stable caches (saved champion art survives updates);
    // anything from the old versioned naming scheme gets cleaned up
    await Promise.all(keys.filter((k) => k !== APP_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Cache-first: keep usable saved artwork without background downloads.
// Old previews used no-cors, creating opaque responses that cannot be served
// to crossorigin="anonymous" images used by the PNG exporter. Repair only
// those incompatible entries; leave valid saved artwork untouched.
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const exact = await cache.match(request);
  const compatible = (response) => response &&
    (response.type !== 'opaque' || request.mode === 'no-cors');
  if (compatible(exact)) return exact;
  try {
    // Bypass the HTTP cache too when replacing an old opaque entry.
    const response = await fetch(exact ? new Request(request, { cache: 'reload' }) : request);
    if (response && (response.ok || response.type === 'opaque')) {
      // Cache quota/storage errors must not discard an otherwise usable image.
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    // offline and not saved yet: fall back to whatever close match exists
    const loose = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (compatible(loose)) return loose;
    throw err;
  }
}

// JSON data files get a one-time background refresh when online, so a new
// LoL patch is picked up on the next visit without blocking the current one.
async function cacheFirstRefresh(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    fetch(request).then((response) => { if (response && response.ok) cache.put(request, response.clone()); }).catch(() => {});
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // App files (same origin): exact cache-first (new ?v= URLs = fresh download,
  // old ones stay for offline fallback)
  if (url.origin === location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith((async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(APP_CACHE);
          // Keep each page separate; the roll page must not replace the draft.
          if(fresh.ok) await cache.put(url.pathname, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(APP_CACHE);
          const page = await cache.match(url.pathname, { ignoreSearch: true });
          if(page) return page;
          // Only the home URL may fall back to the original index page.
          const home = new URL('./', self.registration.scope).pathname;
          if(url.pathname === home || url.pathname === home + 'index.html') {
            return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
          }
          return Response.error();
        }
      })());
    } else {
      event.respondWith(cacheFirst(request, APP_CACHE));
    }
    return;
  }

  // Riot Data Dragon (champion data + artwork)
  if (url.hostname === 'ddragon.leagueoflegends.com') {
    event.respondWith(IMAGE_RE.test(url.pathname)
      ? cacheFirst(request, DATA_CACHE)          // images: saved once, served forever
      : cacheFirstRefresh(request, DATA_CACHE)); // json: cached + refreshed when online
  }
  // everything else: normal network
});
