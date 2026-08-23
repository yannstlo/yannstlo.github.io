const ASSET_CACHE = 'iceland-map-assets-v1';
const TILE_CACHE = 'iceland-map-tiles-v1';
const MAX_CACHED_TILES = 1200;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('iceland-map-') && ![ASSET_CACHE, TILE_CACHE].includes(key))
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.mode === 'navigate') return;

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