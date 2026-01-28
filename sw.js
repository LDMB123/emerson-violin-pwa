const CACHE_VERSION = 'v107';
const CACHE_NAME = `panda-violin-local-${CACHE_VERSION}`;
const APP_SHELL_URL = './index.html';
const OFFLINE_URL = './offline.html';

let ASSETS_TO_CACHE = [];
try {
    importScripts('./sw-assets.js');
    if (Array.isArray(self.__ASSETS__)) {
        ASSETS_TO_CACHE = self.__ASSETS__;
    }
} catch (error) {
    console.warn('[Service Worker] Asset manifest missing, using fallback', error);
}

if (!ASSETS_TO_CACHE.length) {
    ASSETS_TO_CACHE = ['./', APP_SHELL_URL, './manifest.webmanifest'];
}

const buildPrecacheList = () => {
    const precache = new Set(ASSETS_TO_CACHE);
    precache.add('./');
    precache.add(APP_SHELL_URL);
    precache.add('./manifest.webmanifest');
    precache.add(OFFLINE_URL);
    return Array.from(precache);
};

const PRECACHE_URLS = buildPrecacheList();
const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image', 'audio']);
let offlineMode = false;

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await Promise.allSettled(PRECACHE_URLS.map((asset) => cache.add(asset)));
        })()
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            await Promise.all(
                (await caches.keys()).map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
            );
            if (self.registration?.navigationPreload) {
                await self.registration.navigationPreload.enable();
            }
        })()
    );
    self.clients.claim();
});

const parseRange = (rangeHeader, size) => {
    if (!rangeHeader) return null;
    const bytesPrefix = 'bytes=';
    if (!rangeHeader.startsWith(bytesPrefix)) return null;
    const range = rangeHeader.slice(bytesPrefix.length).split('-');
    let start = Number.parseInt(range[0], 10);
    let end = Number.parseInt(range[1], 10);
    if (Number.isNaN(start)) {
        const suffixLength = Number.parseInt(range[1], 10);
        if (Number.isNaN(suffixLength)) return null;
        start = size - suffixLength;
        end = size - 1;
    }
    if (Number.isNaN(end) || end >= size) {
        end = size - 1;
    }
    if (start < 0 || end < 0 || start > end) return null;
    return { start, end };
};

const respondWithRange = async (request) => {
    const rangeHeader = request.headers.get('range');
    if (!rangeHeader) return null;
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request.url);
    if (!cached) return null;
    const buffer = await cached.arrayBuffer();
    const range = parseRange(rangeHeader, buffer.byteLength);
    if (!range) return cached;
    const sliced = buffer.slice(range.start, range.end + 1);
    const headers = new Headers(cached.headers);
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${buffer.byteLength}`);
    headers.set('Content-Length', String(sliced.byteLength));
    headers.set('Accept-Ranges', 'bytes');
    if (!headers.get('Content-Type')) {
        headers.set('Content-Type', 'application/octet-stream');
    }
    return new Response(sliced, { status: 206, statusText: 'Partial Content', headers });
};

const cacheFirst = async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        await notifyOfflineMiss(request, 'cache-first');
        return Response.error();
    }
};

const staleWhileRevalidate = async (request, event) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const fetchPromise = fetch(request).then((response) => {
        if (response && response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    });
    if (cached) {
        if (event) {
            event.waitUntil(fetchPromise.catch(() => {}));
        }
        return cached;
    }
    try {
        return await fetchPromise;
    } catch {
        await notifyOfflineMiss(request, 'stale-while-revalidate');
        return Response.error();
    }
};

const notifyClients = async (payload) => {
    try {
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientList.forEach((client) => client.postMessage(payload));
    } catch {
        // Ignore notification failures
    }
};

const notifyOfflineMiss = async (request, reason = 'fetch') => {
    await notifyClients({
        type: 'OFFLINE_MISS',
        url: request?.url,
        destination: request?.destination,
        reason,
        timestamp: Date.now(),
    });
};

const updateAppShell = async (responsePromise) => {
    try {
        const response = await responsePromise;
        if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(APP_SHELL_URL, response.clone());
        }
    } catch {
        // Ignore update failures
    }
};

const handleNavigation = async (event) => {
    const preloadResponse = await event.preloadResponse;
    const fetchPromise = preloadResponse ? Promise.resolve(preloadResponse) : fetch(event.request);
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(APP_SHELL_URL, { ignoreSearch: true });

    if (cached) {
        event.waitUntil(updateAppShell(fetchPromise));
        return cached;
    }

    try {
        const response = await fetchPromise;
        if (response && response.ok) {
            await cache.put(APP_SHELL_URL, response.clone());
        }
        return response;
    } catch {
        const offline = await cache.match(OFFLINE_URL, { ignoreSearch: true });
        await notifyOfflineMiss(event.request, 'navigate');
        return offline || Response.error();
    }
};

const cacheOnly = async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    await notifyOfflineMiss(request, 'cache-only');
    return Response.error();
};

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    if (offlineMode) {
        if (request.mode === 'navigate' || request.destination === 'document') {
            event.respondWith(
                (async () => {
                    const cache = await caches.open(CACHE_NAME);
                    const cached = await cache.match(APP_SHELL_URL, { ignoreSearch: true });
                    if (cached) return cached;
                    const offline = await cache.match(OFFLINE_URL, { ignoreSearch: true });
                    await notifyOfflineMiss(request, 'offline-mode');
                    return offline || Response.error();
                })()
            );
            return;
        }
        if (request.headers.has('range')) {
            event.respondWith(
                (async () => {
                    const ranged = await respondWithRange(request);
                    if (ranged) return ranged;
                    return cacheOnly(request);
                })()
            );
            return;
        }
        event.respondWith(cacheOnly(request));
        return;
    }

    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(handleNavigation(event));
        return;
    }

    if (request.headers.has('range')) {
        event.respondWith(
            (async () => {
                try {
                    const ranged = await respondWithRange(request);
                    if (ranged) return ranged;
                    return await fetch(request);
                } catch {
                    await notifyOfflineMiss(request, 'range');
                    return Response.error();
                }
            })()
        );
        return;
    }

    if (STATIC_DESTINATIONS.has(request.destination)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request, event));
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data?.type === 'REFRESH_ASSETS') {
        event.waitUntil(refreshAssets());
    }
    if (event.data?.type === 'SET_OFFLINE_MODE') {
        offlineMode = Boolean(event.data.value);
        notifyClients({ type: 'OFFLINE_MODE', value: offlineMode, timestamp: Date.now() });
    }
});

const refreshAssets = async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE_URLS.map((asset) => cache.add(asset)));
    await notifyClients({
        type: 'OFFLINE_REFRESH',
        assetCount: PRECACHE_URLS.length,
        timestamp: Date.now(),
    });
};

self.addEventListener('sync', (event) => {
    if (event.tag === 'panda-refresh') {
        event.waitUntil(refreshAssets());
    }
});

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'panda-refresh') {
        event.waitUntil(refreshAssets());
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('./#view-coach');
            return undefined;
        })
    );
});
