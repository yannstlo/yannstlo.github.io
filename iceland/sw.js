const APP_CACHE = 'iceland-map-app-v1';
const TILE_CACHE = 'iceland-map-tiles-v1';
const MAX_CACHED_TILES = 1200;
const APP_URL = new URL('./', self.registration.scope).href;
const APP_ASSETS = [
  APP_URL,
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => Promise.all(
        APP_ASSETS.map((asset) => cache.add(asset).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('iceland-map-') && ![APP_CACHE, TILE_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

const trimTileCache = async () => {
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  const excess = keys.length - MAX_CACHED_TILES;
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
    if (cacheName === TILE_CACHE) trimTileCache();
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isMapTile = url.hostname.endsWith('.tile.openstreetmap.org');
  const isLeafletAsset = url.hostname === 'unpkg.com' && url.pathname.includes('/leaflet@1.9.4/');

  if (isMapTile) {
    event.respondWith(cacheFirst(event.request, TILE_CACHE));
    return;
  }

  if (isLeafletAsset) {
    event.respondWith(cacheFirst(event.request, APP_CACHE));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(APP_CACHE);
            await cache.put(APP_URL, response.clone());
          }
          return response;
        })
        .catch(async () => (await caches.open(APP_CACHE)).match(APP_URL))
    );
  }
});
