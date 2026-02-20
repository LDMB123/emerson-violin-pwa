import { formatTimestamp } from '../utils/math.js';
import { hasServiceWorkerSupport } from './sw-support.js';
import {
    defaultOfflineMetrics,
    loadOfflineMetrics,
    saveOfflineMetrics,
    formatOfflineSelfTestStatus,
    formatOfflineStatus,
} from './offline-integrity-metrics.js';
import { runOfflineCacheCheck, runOfflineAssetSelfTest } from './offline-integrity-cache.js';

let statusEl = null;
let assetsEl = null;
let missesEl = null;
let lastEl = null;
let checkButton = null;
let selfTestButton = null;
let selfTestStatusEl = null;
let repairButton = null;
let globalsBound = false;
let metricMutationQueue = Promise.resolve();

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

const updateUI = (metrics) => {
    if (!metrics) return;
    if (assetsEl) assetsEl.textContent = `Cached assets: ${metrics.cachedAssets || 0}`;
    if (missesEl) missesEl.textContent = `Offline misses: ${metrics.misses || 0}`;
    if (lastEl) {
        const lastStamp = metrics.lastCheck || metrics.lastRefresh || metrics.lastMiss;
        lastEl.textContent = `Last offline check: ${formatTimestamp(lastStamp)}`;
    }
    if (selfTestStatusEl) {
        selfTestStatusEl.textContent = formatOfflineSelfTestStatus(metrics);
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

const mutateMetrics = async (mutator) => {
    metricMutationQueue = metricMutationQueue
        .catch(() => {})
        .then(async () => {
            const metrics = await loadOfflineMetrics();
            mutator(metrics);
            await saveOfflineMetrics(metrics);
            updateUI(metrics);
            return metrics;
        });
    return metricMutationQueue;
};

const runCheck = async () => {
    const result = await runOfflineCacheCheck();
    await mutateMetrics((metrics) => {
        metrics.cachedAssets = result.cachedAssets;
        metrics.lastCheck = result.lastCheck;
    });
};

const runSelfTest = async () => {
    const result = await runOfflineAssetSelfTest();
    await mutateMetrics((metrics) => {
        metrics.selfTestPass = result.selfTestPass;
        metrics.selfTestTotal = result.selfTestTotal;
        metrics.selfTestAt = result.selfTestAt;
    });
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

    if (event.data.type === 'OFFLINE_MISS') {
        await mutateMetrics((metrics) => {
            metrics.misses += 1;
            metrics.lastMiss = event.data.timestamp || Date.now();
        });
        return;
    }

    if (event.data.type === 'OFFLINE_REFRESH') {
        await mutateMetrics((metrics) => {
            if (Number.isFinite(event.data.assetCount)) {
                metrics.cachedAssets = event.data.assetCount;
            }
            metrics.lastRefresh = event.data.timestamp || Date.now();
        });
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
            const metrics = defaultOfflineMetrics();
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
        const latest = await loadOfflineMetrics();
        updateUI(latest);
    }, { passive: true });
};

const initOfflineIntegrity = async () => {
    resolveElements();
    const metrics = await loadOfflineMetrics();
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
