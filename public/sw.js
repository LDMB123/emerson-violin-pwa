const CACHE_VERSION = 'v110';
const CACHE_NAME = `panda-violin-local-${CACHE_VERSION}`;
const PACK_CACHE_NAME = `panda-violin-pack-${CACHE_VERSION}`;
const PACK_CACHE_PREFIX = 'panda-violin-pack-';
const PACK_MANIFEST_PREFIX = './__pack-manifests__/';
const PACK_MANIFEST_PATH = '/__pack-manifests__/';
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

const buildExpectedUrls = () => PRECACHE_URLS.map((asset) => new URL(asset, self.location.origin).href);

const PRECACHE_URLS = buildPrecacheList();
const EXPECTED_URLS = new Set(buildExpectedUrls());
const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'image', 'audio', 'wasm']);
const MAX_RUNTIME_ENTRIES = 60;
let offlineMode = false;

const cacheAsset = async (cache, asset) => {
    try {
        const request = new Request(asset, { cache: 'reload' });
        await cache.add(request);
    } catch {
        try {
            await cache.add(asset);
        } catch {
            // Ignore asset cache failures
        }
    }
};

const precacheAssets = async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE_URLS.map((asset) => cacheAsset(cache, asset)));
};

const shouldCacheResponse = (response) => {
    if (!response || !response.ok) return false;
    if (response.type === 'opaque') return false;
    const cacheControl = response.headers.get('cache-control') || '';
    if (cacheControl.includes('no-store')) return false;
    return true;
};

const trimRuntimeCache = async (cache) => {
    try {
        const requests = await cache.keys();
        const runtimeRequests = requests.filter((request) => !EXPECTED_URLS.has(request.url));
        if (runtimeRequests.length <= MAX_RUNTIME_ENTRIES) return;
        const excess = runtimeRequests.length - MAX_RUNTIME_ENTRIES;
        await Promise.all(runtimeRequests.slice(0, excess).map((request) => cache.delete(request)));
    } catch {
        // Ignore cache trim failures
    }
};

const cacheResponse = async (cache, request, response) => {
    if (!shouldCacheResponse(response)) return;
    try {
        await cache.put(request, response.clone());
        await trimRuntimeCache(cache);
    } catch {
        // Ignore cache write failures
    }
};

const matchFromCaches = async (request, options) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, options);
    if (cached) return { cached, cache };
    const packCache = await caches.open(PACK_CACHE_NAME);
    const packCached = await packCache.match(request, options);
    if (packCached) return { cached: packCached, cache: packCache };
    return { cached: null, cache };
};

const summarizePackWithCaches = async (assets = [], cache, packCache) => {
    let cached = 0;
    for (const asset of assets) {
        const hit = await cache.match(asset, { ignoreSearch: true });
        if (hit) {
            cached += 1;
            continue;
        }
        const packHit = await packCache.match(asset, { ignoreSearch: true });
        if (packHit) cached += 1;
    }
    return { total: assets.length, cached };
};

const summarizePack = async (assets = []) => {
    const cache = await caches.open(CACHE_NAME);
    const packCache = await caches.open(PACK_CACHE_NAME);
    return summarizePackWithCaches(assets, cache, packCache);
};

const getPackManifestUrl = (packId) => new URL(`${PACK_MANIFEST_PREFIX}${packId}.json`, self.location.origin).href;
const isPackManifestUrl = (url) => typeof url === 'string' && url.includes(PACK_MANIFEST_PATH);
const toAbsoluteUrl = (asset) => new URL(asset, self.location.origin).href;

const buildCachedUrlSet = async () => {
    const cache = await caches.open(CACHE_NAME);
    const packCache = await caches.open(PACK_CACHE_NAME);
    const [cacheKeys, packKeys] = await Promise.all([cache.keys(), packCache.keys()]);
    const cachedUrls = new Set([...cacheKeys, ...packKeys].map((request) => request.url));
    return { cache, packCache, cachedUrls, packKeys };
};

const writePackManifest = async (packId, manifest) => {
    if (!packId || !manifest) return;
    try {
        const cache = await caches.open(PACK_CACHE_NAME);
        const body = JSON.stringify(manifest);
        const response = new Response(body, {
            headers: { 'Content-Type': 'application/json' },
        });
        await cache.put(getPackManifestUrl(packId), response);
    } catch {
        // Ignore manifest persistence failures
    }
};

const readPackManifest = async (packId) => {
    try {
        const cache = await caches.open(PACK_CACHE_NAME);
        const response = await cache.match(getPackManifestUrl(packId), { ignoreSearch: true });
        if (!response) return null;
        return await response.json();
    } catch {
        return null;
    }
};

const verifyCachedPacks = async () => {
    const { packCache, cachedUrls, packKeys } = await buildCachedUrlSet();
    const manifestRequests = packKeys.filter((request) => isPackManifestUrl(request.url));
    for (const request of manifestRequests) {
        let manifest = null;
        try {
            const response = await packCache.match(request, { ignoreSearch: true });
            manifest = response ? await response.json() : null;
        } catch {
            manifest = null;
        }
        if (!manifest?.assets?.length) continue;
        let missing = 0;
        for (const asset of manifest.assets) {
            const absolute = toAbsoluteUrl(asset);
            if (!cachedUrls.has(absolute)) {
                missing += 1;
                await cacheAsset(packCache, asset);
                cachedUrls.add(absolute);
            }
        }
        if (missing) {
            await notifyClients({
                type: 'PACK_AUTO_REPAIR',
                packId: manifest.id || null,
                missing,
                timestamp: Date.now(),
            });
        }
    }
};

const cachePackAssets = async (packId, assets = [], version = null) => {
    await writePackManifest(packId, {
        id: packId,
        version: version || null,
        assets,
        updatedAt: Date.now(),
    });
    const cache = await caches.open(CACHE_NAME);
    const packCache = await caches.open(PACK_CACHE_NAME);
    let completed = 0;
    const total = assets.length;
    for (const asset of assets) {
        const hit = await cache.match(asset, { ignoreSearch: true });
        const packHit = hit ? null : await packCache.match(asset, { ignoreSearch: true });
        if (!hit && !packHit) {
            await cacheAsset(packCache, asset);
        }
        completed += 1;
        await notifyClients({ type: 'PACK_PROGRESS', packId, cached: completed, total, timestamp: Date.now() });
    }
    const summary = await summarizePackWithCaches(assets, cache, packCache);
    await notifyClients({ type: 'PACK_COMPLETE', packId, ...summary, timestamp: Date.now() });
};

const deletePackAssets = async (assets = []) => {
    const cache = await caches.open(PACK_CACHE_NAME);
    await Promise.all(assets.map((asset) => cache.delete(asset, { ignoreSearch: true })));
};

const clearPackAssets = async (packId, assets = []) => {
    await deletePackAssets(assets);
    const cache = await caches.open(PACK_CACHE_NAME);
    await cache.delete(getPackManifestUrl(packId), { ignoreSearch: true });
    await notifyClients({ type: 'PACK_CLEAR_DONE', packId, total: assets.length, timestamp: Date.now() });
};

const verifyPackAssets = async (packId, assets = [], version = null) => {
    const manifest = await readPackManifest(packId);
    const manifestAssets = Array.isArray(manifest?.assets) ? manifest.assets : [];
    if (manifest?.version && version && manifest.version !== version) {
        const staleAssets = manifestAssets.filter((asset) => !assets.includes(asset));
        if (staleAssets.length) {
            await deletePackAssets(staleAssets);
        }
        const cache = await caches.open(PACK_CACHE_NAME);
        await cache.delete(getPackManifestUrl(packId), { ignoreSearch: true });
    }
    await cachePackAssets(packId, assets, version);
};

const clearAllPacks = async () => {
    await caches.delete(PACK_CACHE_NAME);
    await notifyClients({ type: 'PACK_CLEAR_ALL_DONE', timestamp: Date.now() });
};

const getPackSummary = async (packs = []) => {
    const { cachedUrls } = await buildCachedUrlSet();
    const results = [];
    for (const pack of packs) {
        const assets = pack.assets || [];
        let cached = 0;
        assets.forEach((asset) => {
            if (cachedUrls.has(toAbsoluteUrl(asset))) cached += 1;
        });
        const summary = { total: assets.length, cached };
        const manifest = await readPackManifest(pack.id);
        const stale = Boolean(pack.version && (!manifest?.version || manifest.version !== pack.version));
        results.push({
            packId: pack.id,
            version: manifest?.version || null,
            stale,
            ...summary,
        });
    }
    return results;
};

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            await precacheAssets();
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            await Promise.all(
                (await caches.keys()).map((key) => {
                    if (key === CACHE_NAME || key === PACK_CACHE_NAME) return null;
                    if (key.startsWith(PACK_CACHE_PREFIX)) return caches.delete(key);
                    return caches.delete(key);
                })
            );
            const cache = await caches.open(CACHE_NAME);
            await trimRuntimeCache(cache);
            try {
                await verifyCachedPacks();
            } catch {
                // Ignore pack verification failures
            }
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
    const match = await matchFromCaches(request.url, { ignoreSearch: true });
    const cached = match.cached;
    if (!cached) return null;
    let slicedBody = null;
    let byteLength = Number(cached.headers.get('Content-Length'));
    let blob = null;
    try {
        blob = await cached.blob();
        if (!Number.isFinite(byteLength) || byteLength <= 0) {
            byteLength = blob.size;
        }
    } catch {
        blob = null;
    }
    if (!Number.isFinite(byteLength) || byteLength <= 0) return cached;
    const range = parseRange(rangeHeader, byteLength);
    if (!range) return cached;
    if (blob) {
        slicedBody = blob.slice(range.start, range.end + 1);
    } else {
        const buffer = await cached.arrayBuffer();
        slicedBody = buffer.slice(range.start, range.end + 1);
    }
    const headers = new Headers(cached.headers);
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${byteLength}`);
    headers.set('Content-Length', String(slicedBody.size ?? slicedBody.byteLength));
    headers.set('Accept-Ranges', 'bytes');
    if (!headers.get('Content-Type')) {
        headers.set('Content-Type', 'application/octet-stream');
    }
    return new Response(slicedBody, { status: 206, statusText: 'Partial Content', headers });
};

const cacheFirst = async (request) => {
    const match = await matchFromCaches(request);
    const cache = match.cache;
    const cached = match.cached;
    if (cached) return cached;
    try {
        const response = await fetch(request);
        await cacheResponse(cache, request, response);
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
        cacheResponse(cache, request, response);
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

const getCacheSummary = async () => {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    const cachedUrls = new Set(requests.map((request) => request.url));
    const expected = Array.from(EXPECTED_URLS);
    let expectedCached = 0;
    expected.forEach((url) => {
        if (cachedUrls.has(url)) expectedCached += 1;
    });
    return {
        cachedAssets: requests.length,
        expectedTotal: expected.length,
        expectedCached,
    };
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
            await cacheResponse(cache, APP_SHELL_URL, response);
        }
    } catch {
        // Ignore update failures
    }
};

const runOfflineSelfTest = async () => {
    const cache = await caches.open(CACHE_NAME);
    const expected = Array.from(EXPECTED_URLS);
    let pass = 0;
    const missing = [];
    for (const url of expected) {
        const cached = await cache.match(url, { ignoreSearch: true });
        if (cached) {
            pass += 1;
        } else if (missing.length < 5) {
            missing.push(url);
        }
    }
    await notifyClients({
        type: 'OFFLINE_SELFTEST_RESULT',
        expectedTotal: expected.length,
        expectedCached: pass,
        missing,
        timestamp: Date.now(),
    });
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
    const match = await matchFromCaches(request, { ignoreSearch: true });
    const cached = match.cached;
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
    if (event.data?.type === 'OFFLINE_SUMMARY_REQUEST') {
        event.waitUntil(
            (async () => {
                const summary = await getCacheSummary();
                await notifyClients({
                    type: 'OFFLINE_SUMMARY',
                    ...summary,
                    timestamp: Date.now(),
                });
            })()
        );
    }
    if (event.data?.type === 'OFFLINE_SELFTEST') {
        event.waitUntil(runOfflineSelfTest());
    }
    if (event.data?.type === 'SET_OFFLINE_MODE') {
        offlineMode = Boolean(event.data.value);
        notifyClients({ type: 'OFFLINE_MODE', value: offlineMode, timestamp: Date.now() });
    }
    if (event.data?.type === 'PACK_CACHE') {
        const { packId, assets, version } = event.data;
        event.waitUntil(cachePackAssets(packId, Array.isArray(assets) ? assets : [], version || null));
    }
    if (event.data?.type === 'PACK_CLEAR') {
        const { packId, assets } = event.data;
        event.waitUntil(clearPackAssets(packId, Array.isArray(assets) ? assets : []));
    }
    if (event.data?.type === 'PACK_VERIFY') {
        const { packId, assets, version } = event.data;
        event.waitUntil(verifyPackAssets(packId, Array.isArray(assets) ? assets : [], version || null));
    }
    if (event.data?.type === 'PACK_CLEAR_ALL') {
        event.waitUntil(clearAllPacks());
    }
    if (event.data?.type === 'PACK_SUMMARY_REQUEST') {
        const packs = Array.isArray(event.data.packs) ? event.data.packs : [];
        event.waitUntil(
            (async () => {
                const summary = await getPackSummary(packs);
                await notifyClients({ type: 'PACK_SUMMARY', packs: summary, timestamp: Date.now() });
            })()
        );
    }
});

const refreshAssets = async () => {
    await precacheAssets();
    try {
        await verifyCachedPacks();
    } catch {
        // Ignore pack verification failures
    }
    const summary = await getCacheSummary();
    await notifyClients({
        type: 'OFFLINE_REFRESH',
        assetCount: PRECACHE_URLS.length,
        ...summary,
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
