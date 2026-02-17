import { getJSON, setJSON } from '../persistence/storage.js';
import { OFFLINE_MODE_KEY as MODE_KEY } from '../persistence/storage-keys.js';
import { OFFLINE_MODE_CHANGE } from '../utils/event-names.js';
const toggle = document.querySelector('#setting-offline-mode');
const statusEl = document.querySelector('[data-offline-mode-status]');
let currentEnabled = false;

const setStatus = (enabled) => {
    if (!statusEl) return;
    statusEl.textContent = enabled
        ? 'Offline mode is on. The app will use cached content only.'
        : 'Offline mode is off. Cached content will still be used when offline.';
};

const disableToggle = (message) => {
    if (toggle) {
        toggle.checked = false;
        toggle.disabled = true;
    }
    if (statusEl && message) statusEl.textContent = message;
};

const setDataset = (enabled) => {
    if (!document.documentElement) return;
    if (enabled) {
        document.documentElement.dataset.offlineMode = 'on';
    } else {
        delete document.documentElement.dataset.offlineMode;
    }
};

const notifyServiceWorker = async (enabled) => {
    if (!('serviceWorker' in navigator)) return;
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

const init = async () => {
    if (!('serviceWorker' in navigator)) {
        disableToggle('Offline mode requires the installed app and service worker support.');
        return;
    }
    const enabled = await loadState();
    currentEnabled = enabled;
    await applyState(enabled, false);

    if (toggle) {
        toggle.addEventListener('change', () => {
            applyState(toggle.checked, true);
        });
    }

    if ('serviceWorker' in navigator) {
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
