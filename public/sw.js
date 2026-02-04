const CACHE_VERSION = 'v204';
const CACHE_NAME = `emerson-violin-shell-${CACHE_VERSION}`;
const PACK_CACHE = `emerson-violin-packs-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';
const SHARE_ENDPOINT = './share-target';

const DB_NAME = 'emerson-violin-db';
const DB_VERSION = 3;

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

const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('sessions')) {
      db.createObjectStore('sessions', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('recordings')) {
      db.createObjectStore('recordings', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('syncQueue')) {
      db.createObjectStore('syncQueue', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('shareInbox')) {
      db.createObjectStore('shareInbox', { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const withStore = async (storeName, mode, callback) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store, tx);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
};

const addShareEntry = (entry) => withStore('shareInbox', 'readwrite', (store) => {
  store.put(entry);
});

const getSyncEntries = () => withStore('syncQueue', 'readonly', (store) => new Promise((resolve) => {
  const request = store.getAll();
  request.onsuccess = () => resolve(request.result || []);
  request.onerror = () => resolve([]);
}));

const clearSyncEntries = () => withStore('syncQueue', 'readwrite', (store) => {
  store.clear();
});

const notifyClients = async (message) => {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
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

  await Promise.all(files.map(async (file) => {
    if (!file || typeof file === 'string') return null;
    const entry = {
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
    };
    await addShareEntry(entry);
    return entry;
  }));

  await notifyClients({ type: 'SHARE_INBOX_UPDATED' });

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

self.addEventListener('sync', (event) => {
  if (event.tag === 'session-sync') {
    event.waitUntil(
      getSyncEntries()
        .then(async (entries) => {
          if (!entries.length) return 0;
          await clearSyncEntries();
          await notifyClients({ type: 'SYNC_COMPLETE', synced: entries.length });
          return entries.length;
        })
        .catch(() => 0)
    );
  }
});
