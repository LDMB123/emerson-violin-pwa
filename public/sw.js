const CACHE_NAME = 'panda-violin-local-v57';

let ASSETS_TO_CACHE = [];
try {
    importScripts('./sw-assets.js');
    if (Array.isArray(self.__ASSETS__)) {
        ASSETS_TO_CACHE = self.__ASSETS__;
    }
}
catch (error) {
    console.warn('[Service Worker] Asset manifest missing, using fallback', error);
}

if (!ASSETS_TO_CACHE.length) {
    ASSETS_TO_CACHE = ['./', './index.html', './manifest.webmanifest'];
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
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

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }
    const response = await fetch(request);
    if (response && response.ok) {
        cache.put(request, response.clone());
    }
    return response;
}

async function cacheOnly(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || Response.error();
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                const preloadResponse = await event.preloadResponse;
                if (preloadResponse) {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put('./index.html', preloadResponse.clone());
                    return preloadResponse;
                }
                const cached = await caches.match('./index.html', { ignoreSearch: true });
                return cached || cacheFirst(request);
            })()
        );
        return;
    }

    event.respondWith(
        cacheOnly(request)
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

const refreshAssets = async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS_TO_CACHE);
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
