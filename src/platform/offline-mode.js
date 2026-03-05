import { getJSON, setJSON } from '../persistence/storage.js';
import { OFFLINE_MODE_KEY as MODE_KEY } from '../persistence/storage-keys.js';
import { OFFLINE_MODE_CHANGE, emitEvent } from '../utils/event-names.js';
import { setDisabled } from '../utils/dom-utils.js';
import {
    createOnceBinder as createOfflineModeOnceBinder,
    runOnceBinding as runOfflineModeBinding,
} from '../utils/lifecycle-utils.js';
import { hasServiceWorkerSupport } from './sw-support.js';

let toggle = null;
let statusEl = null;
let currentEnabled = false;
const claimGlobalListenersBinding = createOfflineModeOnceBinder();
let initialized = false;
let pendingUserOverride = null;
const SERVICE_WORKER_READY_TIMEOUT_MS = 1200;

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

const waitForServiceWorkerReady = async () => {
    try {
        const ready = navigator.serviceWorker.ready;
        const timeout = new Promise((resolve) => {
            globalThis.setTimeout(() => resolve(null), SERVICE_WORKER_READY_TIMEOUT_MS);
        });
        return await Promise.race([ready, timeout]);
    } catch {
        return null;
    }
};

const notifyServiceWorker = async (enabled) => {
    if (!hasServiceWorkerSupport()) return;
    try {
        let registration = null;
        if (typeof navigator.serviceWorker.getRegistration === 'function') {
            registration = await navigator.serviceWorker.getRegistration().catch(() => null);
        }
        if (!registration?.active) {
            registration = await waitForServiceWorkerReady();
        }
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
    emitEvent(OFFLINE_MODE_CHANGE, { enabled });
    void notifyServiceWorker(enabled);
    if (persist) {
        await setJSON(MODE_KEY, { enabled, updatedAt: Date.now() });
    }
};

const resolveNextEnabledState = () => (toggle ? toggle.checked : currentEnabled);

const syncCurrentState = () => {
    if (!initialized) return;
    return applyState(resolveNextEnabledState(), false);
};

const loadState = async () => {
    const stored = await getJSON(MODE_KEY);
    return Boolean(stored?.enabled);
};

const handleVisibleStateChange = () => {
    if (document.hidden) return;
    syncCurrentState();
};

const bindGlobalListeners = () => runOfflineModeBinding(claimGlobalListenersBinding, () => {
    if (hasServiceWorkerSupport()) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            syncCurrentState();
        });
    }

    document.addEventListener('visibilitychange', handleVisibleStateChange);
});

const bindLocalListeners = () => {
    if (toggle && toggle.dataset.offlineModeBound !== 'true') {
        toggle.dataset.offlineModeBound = 'true';
        toggle.addEventListener('change', () => {
            const next = toggle.checked;
            pendingUserOverride = next;
            applyState(next, true);
        });
    }
};

const initOfflineMode = async () => {
    resolveElements();
    bindLocalListeners();
    bindGlobalListeners();
    setDisabled(toggle, true);
    const persistedEnabled = await loadState();
    const initialEnabled = pendingUserOverride ?? persistedEnabled;
    currentEnabled = initialEnabled;
    await applyState(initialEnabled, false);
    initialized = true;
    setDisabled(toggle, false);
};

/**
 * Initializes offline-only mode state and UI binding.
 *
 * @returns {Promise<void>}
 */
export const init = initOfflineMode;
