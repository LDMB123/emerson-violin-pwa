import { getJSON, setJSON } from '../persistence/storage.js';

const METRICS_KEY = 'panda-violin:offline:metrics-v1';

const statusEl = document.querySelector('[data-offline-status]');
const assetsEl = document.querySelector('[data-offline-assets]');
const missesEl = document.querySelector('[data-offline-misses]');
const lastEl = document.querySelector('[data-offline-last]');
const readyEl = document.querySelector('[data-offline-ready]');
const checkButton = document.querySelector('[data-offline-check]');
const selfTestButton = document.querySelector('[data-offline-selftest]');
const selfTestStatusEl = document.querySelector('[data-offline-selftest-status]');
const repairButton = document.querySelector('[data-offline-repair]');
let autoRepairPending = false;

const defaultMetrics = () => ({
    cachedAssets: 0,
    expectedTotal: 0,
    expectedCached: 0,
    misses: 0,
    lastMiss: 0,
    lastRefresh: 0,
    lastCheck: 0,
    selfTestPass: 0,
    selfTestTotal: 0,
    selfTestAt: 0,
    selfTestMissing: [],
});

const formatTimestamp = (value) => {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return '—';
    }
};

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
        const lastStamp = metrics.lastCheck || metrics.selfTestAt || metrics.lastRefresh || metrics.lastMiss;
        lastEl.textContent = `Last offline check: ${formatTimestamp(lastStamp)}`;
    }
    if (selfTestStatusEl) {
        if (!metrics.selfTestTotal) {
            selfTestStatusEl.textContent = 'Offline self-test: not run yet.';
        } else {
            const missing = metrics.selfTestTotal - metrics.selfTestPass;
            const status = missing ? `Missing ${missing}` : 'All checks passed';
            const missingList = Array.isArray(metrics.selfTestMissing) && metrics.selfTestMissing.length
                ? ` Missing: ${metrics.selfTestMissing.map((url) => url.split('/').pop()).join(', ')}.`
                : '';
            selfTestStatusEl.textContent = `Offline self-test: ${metrics.selfTestPass}/${metrics.selfTestTotal} (${status}).${missingList}`;
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
    updateReadyBadge(metrics);
};

const getStoragePersistState = () => {
    const dataset = document.documentElement?.dataset || {};
    return {
        supported: dataset.storagePersistSupported === 'true',
        persisted: dataset.storagePersisted === 'true',
    };
};

const updateReadyBadge = (metrics) => {
    if (!readyEl || !metrics) return;
    const { supported, persisted } = getStoragePersistState();
    const tested = metrics.selfTestTotal > 0;
    const missing = Math.max(0, (metrics.selfTestTotal || 0) - (metrics.selfTestPass || 0));
    const allCached = tested && missing === 0;

    if (!tested) {
        readyEl.dataset.state = 'partial';
        readyEl.textContent = 'Offline ready: run self-test.';
        return;
    }

    if (!allCached) {
        readyEl.dataset.state = 'warning';
        readyEl.textContent = `Offline ready: missing ${missing} assets.`;
        return;
    }

    if (supported && !persisted) {
        readyEl.dataset.state = 'partial';
        readyEl.textContent = 'Offline ready: protect offline data.';
        return;
    }

    if (!supported) {
        readyEl.dataset.state = 'partial';
        readyEl.textContent = 'Offline ready: limited (storage protection unavailable).';
        return;
    }

    readyEl.dataset.state = 'ready';
    readyEl.textContent = 'Offline ready: all set.';
};

const setButtonsEnabled = (enabled) => {
    const disabled = !enabled;
    if (checkButton) checkButton.disabled = disabled;
    if (selfTestButton) selfTestButton.disabled = disabled;
    if (repairButton) repairButton.disabled = disabled;
};

const requestSummary = async () => {
    if (!('serviceWorker' in navigator)) return;
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'OFFLINE_SUMMARY_REQUEST' });
};

const requestSelfTest = async () => {
    if (!('serviceWorker' in navigator)) return;
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'OFFLINE_SELFTEST' });
};

const maybeAutoRepair = (metrics) => {
    if (!navigator.onLine) return;
    if (autoRepairPending) return;
    if (!metrics?.expectedTotal) return;
    if (metrics.expectedCached >= metrics.expectedTotal) return;
    autoRepairPending = true;
    triggerRepair().finally(() => {
        autoRepairPending = false;
    });
};

const triggerRepair = async () => {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'REFRESH_ASSETS', reason: 'manual-repair' });
    }
    await requestSummary();
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
        if (Number.isFinite(event.data.expectedTotal)) {
            metrics.selfTestTotal = event.data.expectedTotal;
            metrics.expectedTotal = event.data.expectedTotal;
        }
        if (Number.isFinite(event.data.expectedCached)) {
            metrics.selfTestPass = event.data.expectedCached;
            metrics.expectedCached = event.data.expectedCached;
        }
        metrics.lastRefresh = event.data.timestamp || Date.now();
        await saveMetrics(metrics);
        updateUI(metrics);
        return;
    }

    if (event.data.type === 'OFFLINE_SUMMARY') {
        if (Number.isFinite(event.data.cachedAssets)) {
            metrics.cachedAssets = event.data.cachedAssets;
        }
        if (Number.isFinite(event.data.expectedTotal)) {
            metrics.selfTestTotal = event.data.expectedTotal;
            metrics.expectedTotal = event.data.expectedTotal;
        }
        if (Number.isFinite(event.data.expectedCached)) {
            metrics.selfTestPass = event.data.expectedCached;
            metrics.expectedCached = event.data.expectedCached;
        }
        metrics.lastCheck = event.data.timestamp || Date.now();
        await saveMetrics(metrics);
        updateUI(metrics);
        maybeAutoRepair(metrics);
    }

    if (event.data.type === 'OFFLINE_SELFTEST_RESULT') {
        if (Number.isFinite(event.data.expectedTotal)) {
            metrics.selfTestTotal = event.data.expectedTotal;
            metrics.expectedTotal = event.data.expectedTotal;
        }
        if (Number.isFinite(event.data.expectedCached)) {
            metrics.selfTestPass = event.data.expectedCached;
            metrics.expectedCached = event.data.expectedCached;
        }
        if (Array.isArray(event.data.missing)) {
            metrics.selfTestMissing = event.data.missing.slice(0, 5);
        }
        metrics.selfTestAt = event.data.timestamp || Date.now();
        await saveMetrics(metrics);
        updateUI(metrics);
    }
};

const init = async () => {
    const metrics = await loadMetrics();
    updateUI(metrics);
    setButtonsEnabled('serviceWorker' in navigator);

    if (metrics.cachedAssets > 0 && !metrics.selfTestTotal && navigator.onLine) {
        if (selfTestStatusEl) {
            selfTestStatusEl.textContent = 'Offline self-test: running…';
        }
        requestSelfTest();
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    document.addEventListener('panda:storage-persist', async () => {
        const latest = await loadMetrics();
        updateReadyBadge(latest);
    });

    window.addEventListener('online', () => requestSummary(), { passive: true });
    window.addEventListener('offline', async () => {
        const latest = await loadMetrics();
        updateUI(latest);
    }, { passive: true });

    if (checkButton) {
        checkButton.addEventListener('click', () => requestSummary());
    }

    if (selfTestButton) {
        selfTestButton.addEventListener('click', () => {
            if (selfTestStatusEl) {
                selfTestStatusEl.textContent = 'Offline self-test: running…';
            }
            requestSelfTest();
        });
    }

    if (repairButton) {
        repairButton.addEventListener('click', () => {
            const metrics = defaultMetrics();
            metrics.cachedAssets = 0;
            updateUI(metrics);
            triggerRepair();
        });
    }

    requestSummary();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
