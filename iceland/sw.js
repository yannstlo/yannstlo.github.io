const APP_CACHE = 'iceland-map-offline-shell-v1';
const ASSET_CACHE = 'iceland-map-assets-v1';
const TILE_CACHE = 'iceland-map-tiles-v1';
const MAX_CACHED_TILES = 1200;
const APP_URL = new URL('./', self.registration.scope).href;
const APP_ASSETS = [
  APP_URL,
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('iceland-map-') && ![APP_CACHE, ASSET_CACHE, TILE_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

const trimCache = async (cacheName, maximum) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const excess = keys.length - maximum;
  if (excess > 0) {
    await Promise.all(keys.slice(0, excess).map((request) => cache.delete(request)));
  }
};

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone());
    if (cacheName === TILE_CACHE) {
      await trimCache(TILE_CACHE, MAX_CACHED_TILES);
    }
  }
  return response;
};

const saveOfflineShell = async () => {
  const cache = await caches.open(APP_CACHE);
  const results = await Promise.all(
    APP_ASSETS.map((asset) => cache.add(asset).then(() => true).catch(() => false))
  );
  return results.every(Boolean);
};

self.addEventListener('message', (event) => {
  const reply = (payload) => event.ports[0]?.postMessage(payload);

  if (event.data?.type === 'SAVE_OFFLINE') {
    event.waitUntil(
      saveOfflineShell()
        .then((complete) => reply({ enabled: complete }))
        .catch(() => reply({ enabled: false }))
    );
  } else if (event.data?.type === 'REMOVE_OFFLINE') {
    event.waitUntil(
      Promise.all([caches.delete(APP_CACHE), caches.delete(TILE_CACHE)])
        .then(() => reply({ enabled: false }))
    );
  } else if (event.data?.type === 'GET_OFFLINE_STATUS') {
    event.waitUntil(
      caches.has(APP_CACHE).then((enabled) => reply({ enabled }))
    );
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok && await caches.has(APP_CACHE)) {
            const cache = await caches.open(APP_CACHE);
            await cache.put(APP_URL, response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cached = await (await caches.open(APP_CACHE)).match(APP_URL);
          return cached || Response.error();
        })
    );
    return;
  }

  const url = new URL(event.request.url);
  const isMapTile = url.hostname.endsWith('.tile.openstreetmap.org');
  const isLeafletAsset =
    url.hostname === 'unpkg.com' &&
    url.pathname.includes('/leaflet@1.9.4/');

  if (isMapTile) {
    event.respondWith(cacheFirst(event.request, TILE_CACHE));
  } else if (isLeafletAsset) {
    event.respondWith(cacheFirst(event.request, ASSET_CACHE));
  }
});