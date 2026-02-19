import { getJSON, setJSON } from '../persistence/storage.js';
import { OFFLINE_MODE_KEY as MODE_KEY } from '../persistence/storage-keys.js';
import { OFFLINE_MODE_CHANGE } from '../utils/event-names.js';
import { hasServiceWorkerSupport } from './sw-support.js';

let toggle = null;
let statusEl = null;
let currentEnabled = false;
let globalsBound = false;

const resolveElements = () => {
    toggle = document.querySelector('#setting-offline-mode');
    statusEl = document.querySelector('[data-offline-mode-status]');
};

const setStatus = (enabled) => {
    if (!statusEl) return;
    statusEl.textContent = enabled
        ? 'Offline mode is on. The app will use cached content only.'
        : 'Offline mode is off. Cached content will still be used when offline.';
};

const setDataset = (enabled) => {
    if (enabled) {
        document.documentElement.dataset.offlineMode = 'on';
    } else {
        delete document.documentElement.dataset.offlineMode;
    }
};

const notifyServiceWorker = async (enabled) => {
    if (!hasServiceWorkerSupport()) return;
    try {
        const registration = await navigator.serviceWorker.ready;
        if (registration?.active) {
            registration.active.postMessage({ type: 'SET_OFFLINE_MODE', value: enabled });
        }
    } catch {
        // Ignore messaging failures
    }
};

const applyState = async (enabled, persist = true) => {
    currentEnabled = enabled;
    if (toggle) toggle.checked = enabled;
    setDataset(enabled);
    setStatus(enabled);
    document.dispatchEvent(new CustomEvent(OFFLINE_MODE_CHANGE, { detail: { enabled } }));
    await notifyServiceWorker(enabled);
    if (persist) {
        await setJSON(MODE_KEY, { enabled, updatedAt: Date.now() });
    }
};

const loadState = async () => {
    const stored = await getJSON(MODE_KEY);
    return Boolean(stored?.enabled);
};

const bindGlobalListeners = () => {
    if (globalsBound) return;
    globalsBound = true;

    if (hasServiceWorkerSupport()) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            const next = toggle ? toggle.checked : currentEnabled;
            applyState(next, false);
        });
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const next = toggle ? toggle.checked : currentEnabled;
            applyState(next, false);
        }
    });
};

const bindLocalListeners = () => {
    if (toggle && toggle.dataset.offlineModeBound !== 'true') {
        toggle.dataset.offlineModeBound = 'true';
        toggle.addEventListener('change', () => {
            applyState(toggle.checked, true);
        });
    }
};

const initOfflineMode = async () => {
    resolveElements();
    bindLocalListeners();
    bindGlobalListeners();
    if (toggle) toggle.disabled = true;
    const enabled = await loadState();
    currentEnabled = enabled;
    await applyState(enabled, false);
    if (toggle) toggle.disabled = false;
};

export const init = initOfflineMode;
