import { getJSON, setJSON } from '../persistence/storage.js';
import { getAudioPath } from '../audio/format-detection.js';
import { formatTimestamp } from '../utils/math.js';
import { OFFLINE_METRICS_KEY as METRICS_KEY } from '../persistence/storage-keys.js';
import { hasServiceWorkerSupport } from './sw-support.js';

let statusEl = null;
let assetsEl = null;
let missesEl = null;
let lastEl = null;
let checkButton = null;
let selfTestButton = null;
let selfTestStatusEl = null;
let repairButton = null;
let globalsBound = false;

const resolveElements = () => {
    statusEl = document.querySelector('[data-offline-status]');
    assetsEl = document.querySelector('[data-offline-assets]');
    missesEl = document.querySelector('[data-offline-misses]');
    lastEl = document.querySelector('[data-offline-last]');
    checkButton = document.querySelector('[data-offline-check]');
    selfTestButton = document.querySelector('[data-offline-selftest]');
    selfTestStatusEl = document.querySelector('[data-offline-selftest-status]');
    repairButton = document.querySelector('[data-offline-repair]');
};

const CRITICAL_ASSETS = [
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

const defaultMetrics = () => ({
    cachedAssets: 0,
    misses: 0,
    lastMiss: 0,
    lastRefresh: 0,
    lastCheck: 0,
    selfTestPass: 0,
    selfTestTotal: 0,
    selfTestAt: 0,
});

const loadMetrics = async () => {
    const stored = await getJSON(METRICS_KEY);
    return { ...defaultMetrics(), ...(stored || {}) };
};

const saveMetrics = async (metrics) => {
    await setJSON(METRICS_KEY, metrics);
};

const formatSelfTestStatus = (metrics) => {
    if (!metrics.selfTestTotal) {
        return 'Offline self-test: not run yet.';
    }
    const missing = metrics.selfTestTotal - metrics.selfTestPass;
    const status = missing ? `Missing ${missing}` : 'All checks passed';
    return `Offline self-test: ${metrics.selfTestPass}/${metrics.selfTestTotal} (${status}).`;
};

const formatOfflineStatus = (metrics) => {
    if (!metrics.cachedAssets) {
        return 'Offline integrity: Not cached yet. Open once while online.';
    }
    if (!navigator.onLine) {
        return 'Offline integrity: Ready for offline use.';
    }
    return 'Offline integrity: Ready. Keep installed for best results.';
};

const updateUI = (metrics) => {
    if (!metrics) return;
    if (assetsEl) assetsEl.textContent = `Cached assets: ${metrics.cachedAssets || 0}`;
    if (missesEl) missesEl.textContent = `Offline misses: ${metrics.misses || 0}`;
    if (lastEl) {
        const lastStamp = metrics.lastCheck || metrics.lastRefresh || metrics.lastMiss;
        lastEl.textContent = `Last offline check: ${formatTimestamp(lastStamp)}`;
    }
    if (selfTestStatusEl) {
        selfTestStatusEl.textContent = formatSelfTestStatus(metrics);
    }
    if (statusEl) {
        statusEl.textContent = formatOfflineStatus(metrics);
    }
};

const setButtonsSupported = (supported) => {
    const disabled = !supported;
    if (checkButton) checkButton.disabled = disabled;
    if (selfTestButton) selfTestButton.disabled = disabled;
    if (repairButton) repairButton.disabled = disabled;
};

const selectCache = async () => {
    const keys = await caches.keys();
    const matches = keys
        .filter((key) => key.startsWith('panda-violin-local-'))
        .map((key) => {
            const parts = key.split('-v');
            const version = parts.length > 1 ? Number.parseInt(parts[parts.length - 1], 10) : 0;
            return { key, version: Number.isNaN(version) ? 0 : version };
        });
    if (!matches.length) return null;
    matches.sort((a, b) => a.version - b.version);
    const latest = matches[matches.length - 1]?.key;
    return latest ? caches.open(latest) : null;
};

const runCheck = async () => {
    const metrics = await loadMetrics();
    const cache = await selectCache();
    if (!cache) {
        metrics.cachedAssets = 0;
        metrics.lastCheck = Date.now();
        await saveMetrics(metrics);
        updateUI(metrics);
        return;
    }

    const requests = await cache.keys();
    metrics.cachedAssets = requests.length;
    metrics.lastCheck = Date.now();
    await saveMetrics(metrics);
    updateUI(metrics);
};

const runSelfTest = async () => {
    const metrics = await loadMetrics();
    const cache = await selectCache();
    if (!cache) {
        metrics.selfTestPass = 0;
        metrics.selfTestTotal = CRITICAL_ASSETS.length;
        metrics.selfTestAt = Date.now();
        await saveMetrics(metrics);
        updateUI(metrics);
        return;
    }

    let passCount = 0;
    for (const asset of CRITICAL_ASSETS) {
        const absolute = new URL(asset, window.location.href).toString();
        const match = await cache.match(absolute);
        if (match) {
            passCount += 1;
        }
    }

    metrics.selfTestPass = passCount;
    metrics.selfTestTotal = CRITICAL_ASSETS.length;
    metrics.selfTestAt = Date.now();
    await saveMetrics(metrics);
    updateUI(metrics);
};

const triggerRepair = async () => {
    if (!hasServiceWorkerSupport()) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'REFRESH_ASSETS', reason: 'manual-repair' });
    }
    await runCheck();
    await runSelfTest();
};

const handleMessage = async (event) => {
    if (!event?.data?.type) return;
    const metrics = await loadMetrics();

    if (event.data.type === 'OFFLINE_MISS') {
        metrics.misses += 1;
        metrics.lastMiss = event.data.timestamp || Date.now();
        await saveMetrics(metrics);
        updateUI(metrics);
        return;
    }

    if (event.data.type === 'OFFLINE_REFRESH') {
        if (Number.isFinite(event.data.assetCount)) {
            metrics.cachedAssets = event.data.assetCount;
        }
        metrics.lastRefresh = event.data.timestamp || Date.now();
        await saveMetrics(metrics);
        updateUI(metrics);
    }
};

const bindLocalListeners = () => {
    if (checkButton && checkButton.dataset.offlineBound !== 'true') {
        checkButton.dataset.offlineBound = 'true';
        checkButton.addEventListener('click', () => runCheck());
    }

    if (selfTestButton && selfTestButton.dataset.offlineBound !== 'true') {
        selfTestButton.dataset.offlineBound = 'true';
        selfTestButton.addEventListener('click', () => runSelfTest());
    }

    if (repairButton && repairButton.dataset.offlineBound !== 'true') {
        repairButton.dataset.offlineBound = 'true';
        repairButton.addEventListener('click', () => {
            const metrics = defaultMetrics();
            metrics.cachedAssets = 0;
            updateUI(metrics);
            triggerRepair();
        });
    }
};

const bindGlobalListeners = () => {
    if (globalsBound) return;
    globalsBound = true;

    navigator.serviceWorker.addEventListener('message', handleMessage);

    window.addEventListener('online', () => runCheck(), { passive: true });
    window.addEventListener('offline', async () => {
        const latest = await loadMetrics();
        updateUI(latest);
    }, { passive: true });
};

const initOfflineIntegrity = async () => {
    resolveElements();
    const metrics = await loadMetrics();
    updateUI(metrics);
    const supportsServiceWorker = hasServiceWorkerSupport();
    setButtonsSupported(supportsServiceWorker);

    if (!supportsServiceWorker) {
        if (statusEl) {
            statusEl.textContent = 'Offline integrity: Service worker not supported on this browser.';
        }
        if (selfTestStatusEl) {
            selfTestStatusEl.textContent = 'Offline self-test: unavailable without service worker support.';
        }
        return;
    }

    bindGlobalListeners();
    bindLocalListeners();

    runCheck();
    runSelfTest();
};

export const init = initOfflineIntegrity;
