import { whenReady } from '../utils/dom-ready.js';
import { getJSON, setJSON } from '../persistence/storage.js';
import { getAudioPath } from '../audio/format-detection.js';
import { formatTimestamp } from '../utils/math.js';
import { OFFLINE_METRICS_KEY as METRICS_KEY } from '../persistence/storage-keys.js';

const statusEl = document.querySelector('[data-offline-status]');
const assetsEl = document.querySelector('[data-offline-assets]');
const missesEl = document.querySelector('[data-offline-misses]');
const lastEl = document.querySelector('[data-offline-last]');
const checkButton = document.querySelector('[data-offline-check]');
const selfTestButton = document.querySelector('[data-offline-selftest]');
const selfTestStatusEl = document.querySelector('[data-offline-selftest-status]');
const repairButton = document.querySelector('[data-offline-repair]');

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

const updateUI = (metrics) => {
    if (!metrics) return;
    if (assetsEl) assetsEl.textContent = `Cached assets: ${metrics.cachedAssets || 0}`;
    if (missesEl) missesEl.textContent = `Offline misses: ${metrics.misses || 0}`;
    if (lastEl) {
        const lastStamp = metrics.lastCheck || metrics.lastRefresh || metrics.lastMiss;
        lastEl.textContent = `Last offline check: ${formatTimestamp(lastStamp)}`;
    }
    if (selfTestStatusEl) {
        if (!metrics.selfTestTotal) {
            selfTestStatusEl.textContent = 'Offline self-test: not run yet.';
        } else {
            const missing = metrics.selfTestTotal - metrics.selfTestPass;
            const status = missing ? `Missing ${missing}` : 'All checks passed';
            selfTestStatusEl.textContent = `Offline self-test: ${metrics.selfTestPass}/${metrics.selfTestTotal} (${status}).`;
        }
    }
    if (statusEl) {
        if (!metrics.cachedAssets) {
            statusEl.textContent = 'Offline integrity: Not cached yet. Open once while online.';
        } else if (!navigator.onLine) {
            statusEl.textContent = 'Offline integrity: Ready for offline use.';
        } else {
            statusEl.textContent = 'Offline integrity: Ready. Keep installed for best results.';
        }
    }
};

const setButtonsEnabled = (enabled) => {
    const disabled = !enabled;
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
        setButtonsEnabled(false);
        return;
    }

    const requests = await cache.keys();
    metrics.cachedAssets = requests.length;
    metrics.lastCheck = Date.now();
    await saveMetrics(metrics);
    updateUI(metrics);
    setButtonsEnabled(true);
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
        setButtonsEnabled(false);
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
    setButtonsEnabled(true);
};

const triggerRepair = async () => {
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

const init = async () => {
    const metrics = await loadMetrics();
    updateUI(metrics);
    setButtonsEnabled(true);

    navigator.serviceWorker.addEventListener('message', handleMessage);

    window.addEventListener('online', () => runCheck(), { passive: true });
    window.addEventListener('offline', async () => {
        const latest = await loadMetrics();
        updateUI(latest);
    }, { passive: true });

    if (checkButton) {
        checkButton.addEventListener('click', () => runCheck());
    }

    if (selfTestButton) {
        selfTestButton.addEventListener('click', () => runSelfTest());
    }

    if (repairButton) {
        repairButton.addEventListener('click', () => {
            const metrics = defaultMetrics();
            metrics.cachedAssets = 0;
            updateUI(metrics);
            triggerRepair();
        });
    }

    runCheck();
    runSelfTest();
};

whenReady(init);
