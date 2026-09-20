// sw.js — Riftcrafter offline service worker  [verified manual offline packs 20260920e]
// Once something is downloaded it stays saved: images are served from the
// device cache. Legacy opaque entries are repaired on demand for CORS images.
// Cache names are stable on purpose — updating the site must not wipe saved art.
const APP_CACHE = 'riftcrafter-app-v1';
const DATA_CACHE = 'riftcrafter-data-v1';
const OFFLINE_BUILD = '20260920-offline1';
const OFFLINE_META_URL = new URL('./.rift-offline-pack.json', self.registration.scope).href;

// Everything the game needs to run offline (app shell).
const APP_SHELL = [
  './', './index.html', './champion-roll.html',
  './css/page-switcher.css', './js/page-switcher.js',
  './css/guide.css', './js/guide.js',
  './css/offline.css', './js/offline.js',
  './js/roll-sound.js', './sounds/rollsond.mp3',
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
  if (event.data?.type === 'OFFLINE_CONFIG' && event.ports[0]) {
    const optional = ['./sounds/rollsond.mp3'];
    event.ports[0].postMessage({
      schema: 1, build: OFFLINE_BUILD, scope: self.registration.scope,
      appCache: APP_CACHE, dataCache: DATA_CACHE, metadata: OFFLINE_META_URL,
      required: APP_SHELL.filter(path => !optional.includes(path)).map(path => new URL(path, self.registration.scope).href),
      optional: optional.map(path => new URL(path, self.registration.scope).href)
    });
  }
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

// A completed pack pins a fully downloaded patch for a fresh offline draft.
// Normal online play still uses the live version list. Do not select a newer,
// only-partly-cached patch merely because its roster was seen on a previous visit.
async function offlineAwareVersions(request) {
  const cache = await caches.open(DATA_CACHE);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const fresh = await fetch(new Request(request, { cache: 'no-cache', signal: controller.signal }));
    if (!fresh.ok) throw new Error('Versions unavailable');
    const versions = await fresh.clone().json();
    if (!Array.isArray(versions) || !/^\d+\.\d+\.\d+$/.test(versions[0])) throw new Error('Invalid versions');
    await cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (_) {
    const app = await caches.open(APP_CACHE);
    const saved = await app.match(OFFLINE_META_URL);
    const manifest = saved ? await saved.json().catch(() => null) : null;
    const patch = manifest?.ready ? manifest.patch : manifest?.fallbackPatch;
    if (/^\d+\.\d+\.\d+$/.test(patch || '')) {
      return new Response(JSON.stringify([patch]), { headers: { 'Content-Type': 'application/json' } });
    }
    return (await cache.match(request, { ignoreSearch: true })) || Response.error();
  } finally { clearTimeout(timer); }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // The manual downloader validates and saves its own responses. A marked
  // request must reach the network, not accidentally re-use an invalid cache hit.
  if (url.searchParams.get('__rift_offline') === '1' &&
      (url.origin === location.origin || url.hostname === 'ddragon.leagueoflegends.com')) {
    url.searchParams.delete('__rift_offline');
    event.respondWith(fetch(new Request(new Request(url.href, request), { cache: 'reload' })));
    return;
  }
  if (url.hostname === 'ddragon.leagueoflegends.com' && url.pathname === '/api/versions.json') {
    event.respondWith(offlineAwareVersions(request));
    return;
  }

  // App files (same origin): exact cache-first (new ?v= URLs = fresh download,
  // old ones stay for offline fallback)
  if (url.origin === location.origin) {
    // Revalidate this user-supplied clip so replacing it updates the roll sound.
    // Keep the last valid copy available offline; never cache a missing-file page.
    if (url.pathname === new URL('./sounds/rollsond.mp3', self.registration.scope).pathname) {
      event.respondWith((async () => {
        const cache = await caches.open(APP_CACHE);
        try {
          const response = await fetch(new Request(request, { cache: 'no-cache' }));
          if (response.ok) {
            await cache.put(request, response.clone()).catch(() => {});
            return response;
          }
          return (await cache.match(request, { ignoreSearch: true })) || response;
        } catch {
          return (await cache.match(request, { ignoreSearch: true })) || Response.error();
        }
      })());
      return;
    }
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
