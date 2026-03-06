import { hasServiceWorkerSupport } from './sw-support.js';
import { createSwUpdateFlowController } from './sw-update-flow.js';
import { createSwRefreshController } from './sw-refresh-controller.js';
import {
    createTextContentSetter,
    setHidden,
    setDisabled,
} from '../utils/dom-utils.js';

let statusEl = null;
let syncStatusEl = null;
let updateButton = null;
let applyButton = null;
let globalsBound = false;

const resolveElements = () => {
    statusEl = document.querySelector('[data-sw-status]');
    syncStatusEl = document.querySelector('[data-sync-status]');
    updateButton = document.querySelector('[data-sw-update]');
    applyButton = document.querySelector('[data-sw-apply]');
};

const getStatusEl = () => statusEl;
const setStatus = createTextContentSetter(getStatusEl);
const setSyncStatus = createTextContentSetter(() => syncStatusEl);

const showApply = (show) => {
    setHidden(applyButton, !show);
    setDisabled(applyButton, !show);
};

const updateFlowController = createSwUpdateFlowController({
    setStatus,
    showApply,
});
const refreshController = createSwRefreshController({
    setSyncStatus,
});

const supportsServiceWorker = () => {
    if (hasServiceWorkerSupport()) return true;
    setStatus('Service worker not supported on this browser.');
    return false;
};

const getServiceWorkerRegistration = async ({ onMissing } = {}) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) return registration;
    if (typeof onMissing === 'function') onMissing();
    return null;
};
const handleMissingRegistration = () => {
    setStatus('Service worker not ready yet.');
};

const applyUpdate = async () => {
    if (!supportsServiceWorker()) return;
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) return;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
};

const checkForUpdates = async () => {
    if (!supportsServiceWorker()) return;
    setStatus('Checking for updates…');
    try {
        const registration = await getServiceWorkerRegistration({
            onMissing: handleMissingRegistration,
        });
        if (!registration) return;
        await registration.update();
        updateFlowController.bindUpdateFlow(registration);
    } catch {
        setStatus('Unable to check for updates right now.');
    }
};

const claimGlobalBinding = () => {
    if (globalsBound) return false;
    globalsBound = true;
    return true;
};

const bindGlobalListeners = () => {
    if (!claimGlobalBinding()) return;
    navigator.serviceWorker.addEventListener('controllerchange', updateFlowController.handleControllerChange);
};

const bindLocalListeners = () => {
    if (updateButton && updateButton.dataset.swBound !== 'true') {
        updateButton.dataset.swBound = 'true';
        updateButton.addEventListener('click', checkForUpdates);
    }

    if (applyButton && applyButton.dataset.swBound !== 'true') {
        applyButton.dataset.swBound = 'true';
        applyButton.addEventListener('click', applyUpdate);
    }
};

const initSwUpdates = async () => {
    resolveElements();

    if (!hasServiceWorkerSupport()) {
        setStatus('Service worker not supported on this browser.');
        setSyncStatus('Background refresh unavailable on this browser.');
        showApply(false);
        setDisabled(updateButton, true);
        setDisabled(applyButton, true);
        return;
    }
    const registration = await getServiceWorkerRegistration({
        onMissing: () => {
            setStatus('Service worker not ready yet.');
            setSyncStatus('Background refresh will start once the app is installed.');
            setDisabled(updateButton, true);
            setDisabled(applyButton, true);
            showApply(false);
        },
    });
    if (!registration) return;

    setDisabled(updateButton, false);
    updateFlowController.bindUpdateFlow(registration);
    refreshController.registerBackgroundRefresh(registration);
    bindLocalListeners();
    bindGlobalListeners();
};

/**
 * Initializes service-worker update UI and background refresh wiring.
 *
 * @returns {Promise<void>}
 */
export const init = initSwUpdates;
