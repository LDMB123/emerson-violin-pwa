import {
    shouldRetryPersist,
    formatBytes,
    isStandalone,
    setRootDataset,
} from './platform-utils.js';
import { PERSIST_REQUEST_KEY } from '../persistence/storage-keys.js';
import { OFFLINE_MODE_CHANGE } from '../utils/event-names.js';

const createEmptyElements = () => ({
    statusEl: null,
    estimateEl: null,
    requestButton: null,
    networkStatusEl: null,
});

const loadPersistRequest = () => {
    try {
        const raw = localStorage.getItem(PERSIST_REQUEST_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const savePersistRequest = (state) => {
    try {
        localStorage.setItem(PERSIST_REQUEST_KEY, JSON.stringify(state));
    } catch {
        // Ignore storage failures
    }
};

export const createStorageController = () => {
    let elements = createEmptyElements();
    let storageGlobalsBound = false;
    let networkGlobalsBound = false;

    const updateStorageEstimate = async () => {
        try {
            const { usage, quota } = await navigator.storage.estimate();
            if (Number.isFinite(quota) && quota > 0) {
                const ratio = usage / quota;
                const pressure = ratio > 0.9 ? 'high' : ratio > 0.75 ? 'medium' : 'low';
                setRootDataset('storagePressure', pressure);
                if (elements.estimateEl) {
                    const warning = pressure === 'high'
                        ? ' Storage nearly full — consider exporting recordings.'
                        : pressure === 'medium'
                            ? ' Storage starting to fill up.'
                            : '';
                    elements.estimateEl.textContent = `Storage used: ${formatBytes(usage)} / ${formatBytes(quota)}.${warning}`;
                }
            } else {
                setRootDataset('storagePressure', null);
                if (elements.estimateEl) {
                    elements.estimateEl.textContent = `Storage used: ${formatBytes(usage)}.`;
                }
            }
        } catch {
            if (elements.estimateEl) {
                elements.estimateEl.textContent = 'Storage estimate unavailable right now.';
            }
        }
    };

    const updateStorageStatus = async (request = false) => {
        try {
            let persisted = await navigator.storage.persisted();
            if (!persisted && request) {
                persisted = await navigator.storage.persist();
            }
            setRootDataset('storagePersisted', persisted ? 'true' : 'false');
            if (elements.requestButton) {
                elements.requestButton.disabled = persisted;
            }
            if (elements.statusEl) {
                elements.statusEl.textContent = persisted
                    ? 'Offline storage is protected.'
                    : 'Offline storage may be cleared if the device is low on space.';
            }
            return { persisted };
        } catch {
            if (elements.statusEl) {
                elements.statusEl.textContent = 'Unable to confirm offline storage status.';
            }
            return { persisted: false };
        }
    };

    const requestPersistentStorage = async (reason) => {
        if (document.hidden) return false;
        const previous = loadPersistRequest();
        if (!shouldRetryPersist(previous)) return false;
        const nextState = {
            lastAttempt: Date.now(),
            reason,
            persisted: false,
        };
        savePersistRequest(nextState);
        try {
            const persisted = await navigator.storage.persist();
            nextState.persisted = Boolean(persisted);
            savePersistRequest(nextState);
            return nextState.persisted;
        } catch {
            return false;
        }
    };

    const maybeAutoPersist = async (reason) => {
        const persisted = await navigator.storage.persisted();
        if (persisted) return;
        const offlineMode = document.documentElement.dataset.offlineMode === 'on';
        const shouldAttempt = isStandalone() || offlineMode;
        if (!shouldAttempt) return;
        const didPersist = await requestPersistentStorage(reason);
        if (didPersist) {
            updateStorageStatus();
        }
    };

    const bindStorageUI = () => {
        updateStorageStatus();
        updateStorageEstimate();
        maybeAutoPersist('boot');
        if (elements.requestButton && elements.requestButton.dataset.nativeBound !== 'true') {
            elements.requestButton.dataset.nativeBound = 'true';
            elements.requestButton.addEventListener('click', () => {
                updateStorageStatus(true).then(updateStorageEstimate);
            });
        }

        if (storageGlobalsBound) return;
        storageGlobalsBound = true;

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                updateStorageEstimate();
                updateStorageStatus();
                maybeAutoPersist('visible');
            }
        });
        window.addEventListener('online', () => {
            updateStorageEstimate();
            updateStorageStatus();
            maybeAutoPersist('online');
        }, { passive: true });
        document.addEventListener(OFFLINE_MODE_CHANGE, () => {
            maybeAutoPersist('offline-mode');
        });
    };

    const updateNetworkStatus = () => {
        if (!elements.networkStatusEl) return;
        const online = navigator.onLine;
        const offlineMode = document.documentElement.dataset.offlineMode === 'on';
        if (offlineMode) {
            elements.networkStatusEl.textContent = 'Network status: Offline mode enabled (cached-only).';
            return;
        }
        elements.networkStatusEl.textContent = online
            ? 'Network status: Online (offline mode still available).'
            : 'Network status: Offline (local content is ready).';
    };

    const bindNetworkStatus = () => {
        if (!elements.networkStatusEl) return;
        updateNetworkStatus();
        if (networkGlobalsBound) return;
        networkGlobalsBound = true;
        window.addEventListener('online', updateNetworkStatus, { passive: true });
        window.addEventListener('offline', updateNetworkStatus, { passive: true });
        document.addEventListener(OFFLINE_MODE_CHANGE, updateNetworkStatus);
    };

    return {
        setElements(nextElements) {
            elements = {
                ...createEmptyElements(),
                ...nextElements,
            };
        },
        updateStorageStatus,
        maybeAutoPersist,
        bindStorageUI,
        bindNetworkStatus,
    };
};
