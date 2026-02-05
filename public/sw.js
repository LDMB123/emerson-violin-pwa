const CACHE_VERSION = 'v204';
const CACHE_NAME = `emerson-violin-shell-${CACHE_VERSION}`;
const PACK_CACHE = `emerson-violin-packs-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';
const SHARE_ENDPOINT = './share-target';

let ASSETS_TO_CACHE = [];
try {
  importScripts('./sw-assets.js');
  if (Array.isArray(self.__ASSETS__)) {
    ASSETS_TO_CACHE = self.__ASSETS__;
  }
} catch (error) {
  console.warn('[sw] asset manifest missing', error);
}

if (!ASSETS_TO_CACHE.length) {
  ASSETS_TO_CACHE = ['./', './index.html', './manifest.webmanifest', OFFLINE_URL];
}

const PRECACHE_URLS = Array.from(new Set([
  ...ASSETS_TO_CACHE,
  './',
  './index.html',
  './manifest.webmanifest',
  OFFLINE_URL,
]));

const notifyClients = async (message) => {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
};

const shareToClients = async (entries) => {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length) {
    clients.forEach((client) => client.postMessage({ type: 'SHARE_PAYLOAD', entries }));
    return;
  }
  const client = await self.clients.openWindow('./#core');
  if (client) {
    client.postMessage({ type: 'SHARE_PAYLOAD', entries });
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => (
        key === CACHE_NAME || key === PACK_CACHE ? null : caches.delete(key)
      ))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data || !data.type) return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CACHE_STATS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.keys())
        .then((entries) => notifyClients({
          type: 'CACHE_STATS',
          cacheEntries: entries.length,
          precacheEntries: PRECACHE_URLS.length,
        }))
    );
  }
  if (data.type === 'CLEAR_PACKS') {
    event.waitUntil(
      caches.delete(PACK_CACHE).then(() => notifyClients({ type: 'PACKS_CLEARED' }))
    );
  }
});

const cacheFirst = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
};

const networkFirst = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return cache.match(OFFLINE_URL);
    }
    return cached;
  }
};

const handleShareTarget = async (request) => {
  const formData = await request.formData();
  const files = formData.getAll('files').filter(Boolean);
  const title = formData.get('title');
  const text = formData.get('text');
  const url = formData.get('url');
  const createdAt = new Date().toISOString();

  const entries = [];
  for (const file of files) {
    if (!file || typeof file === 'string') continue;
    entries.push({
      id: `${createdAt}-${file.name}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified,
      createdAt,
      title,
      text,
      url,
      blob: file,
    });
  }

  if (!entries.length && (title || text || url)) {
    entries.push({
      id: `${createdAt}-share-${Math.random().toString(16).slice(2)}`,
      name: title || url || 'Shared item',
      type: 'text/plain',
      size: 0,
      lastModified: Date.now(),
      createdAt,
      title,
      text,
      url,
    });
  }

  await shareToClients(entries);

  return Response.redirect('./#core', 303);
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method === 'POST') {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/share-target') || url.pathname.endsWith('share-target')) {
      event.respondWith(handleShareTarget(request));
    }
    return;
  }

  if (request.method !== 'GET') return;

  const destination = request.destination;

  if (request.mode === 'navigate' || destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (['style', 'script', 'image', 'font', 'audio', 'video'].includes(destination)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
