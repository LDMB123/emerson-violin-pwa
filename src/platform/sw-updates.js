import { hasServiceWorkerSupport } from './sw-support.js';
import { createSwUpdateFlowController } from './sw-update-flow.js';
import { createSwRefreshController } from './sw-refresh-controller.js';
import { setHidden, setDisabled, setTextContent } from '../utils/dom-utils.js';

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

const setStatus = (message) => {
    setTextContent(statusEl, message);
};

const setSyncStatus = (message) => {
    setTextContent(syncStatusEl, message);
};

const showApply = (show) => {
    setHidden(applyButton, !show);
};

const updateFlowController = createSwUpdateFlowController({
    setStatus,
    showApply,
});
const refreshController = createSwRefreshController({
    setSyncStatus,
});

const applyUpdate = async () => {
    if (!hasServiceWorkerSupport()) {
        setStatus('Service worker not supported on this browser.');
        return;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) return;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
};

const checkForUpdates = async () => {
    if (!hasServiceWorkerSupport()) {
        setStatus('Service worker not supported on this browser.');
        return;
    }
    setStatus('Checking for updates…');
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            setStatus('Service worker not ready yet.');
            return;
        }
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
    navigator.serviceWorker.addEventListener('controllerchange', updateFlowController.handleControllerChange, { once: true });
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
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
        setStatus('Service worker not ready yet.');
        setSyncStatus('Background refresh will start once the app is installed.');
        setDisabled(updateButton, true);
        return;
    }

    updateFlowController.bindUpdateFlow(registration);
    refreshController.registerBackgroundRefresh(registration);
    bindLocalListeners();
    bindGlobalListeners();
};

export const init = initSwUpdates;
