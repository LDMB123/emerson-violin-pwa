import { getAudioPath } from '../audio/format-detection.js';

const OFFLINE_CACHE_PREFIX = 'panda-violin-local-';

const CRITICAL_OFFLINE_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './offline.html',
    './src/app.js',
    './src/styles/app.css',
    './src/assets/fonts/fraunces-vf.woff2',
    './src/assets/fonts/nunito-vf.woff2',
    './assets/icons/icon-192.png',
    './assets/illustrations/mascot-happy.png',
    getAudioPath('./assets/audio/violin-a4.wav'),
    getAudioPath('./assets/audio/violin-g3.wav'),
    getAudioPath('./assets/audio/violin-d4.wav'),
    getAudioPath('./assets/audio/violin-e5.wav'),
    getAudioPath('./assets/audio/metronome-90.wav'),
    getAudioPath('./assets/audio/metronome-60.wav'),
    getAudioPath('./assets/audio/metronome-120.wav'),
];

const parseVersion = (cacheKey) => {
    const parts = cacheKey.split('-v');
    const rawVersion = parts.length > 1 ? Number.parseInt(parts[parts.length - 1], 10) : 0;
    return Number.isNaN(rawVersion) ? 0 : rawVersion;
};

export const selectOfflineCache = async () => {
    const keys = await caches.keys();
    const matchingKeys = keys
        .filter((key) => key.startsWith(OFFLINE_CACHE_PREFIX))
        .map((key) => ({ key, version: parseVersion(key) }));
    if (!matchingKeys.length) return null;
    matchingKeys.sort((a, b) => a.version - b.version);
    const latest = matchingKeys[matchingKeys.length - 1]?.key;
    return latest ? caches.open(latest) : null;
};

export const runOfflineCacheCheck = async () => {
    const cache = await selectOfflineCache();
    if (!cache) {
        return {
            cachedAssets: 0,
            lastCheck: Date.now(),
        };
    }
    const requests = await cache.keys();
    return {
        cachedAssets: requests.length,
        lastCheck: Date.now(),
    };
};

export const runOfflineAssetSelfTest = async ({ baseHref = window.location.href } = {}) => {
    const cache = await selectOfflineCache();
    if (!cache) {
        return {
            selfTestPass: 0,
            selfTestTotal: CRITICAL_OFFLINE_ASSETS.length,
            selfTestAt: Date.now(),
        };
    }

    let passCount = 0;
    for (const assetPath of CRITICAL_OFFLINE_ASSETS) {
        const absolutePath = new URL(assetPath, baseHref).toString();
        const match = await cache.match(absolutePath);
        if (match) {
            passCount += 1;
        }
    }

    return {
        selfTestPass: passCount,
        selfTestTotal: CRITICAL_OFFLINE_ASSETS.length,
        selfTestAt: Date.now(),
    };
};
