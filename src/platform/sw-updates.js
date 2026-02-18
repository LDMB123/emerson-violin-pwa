import { whenReady } from '../utils/dom-ready.js';

const statusEl = document.querySelector('[data-sw-status]');
const syncStatusEl = document.querySelector('[data-sync-status]');
const updateButton = document.querySelector('[data-sw-update]');
const applyButton = document.querySelector('[data-sw-apply]');

const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
};

const setSyncStatus = (message) => {
    if (syncStatusEl) syncStatusEl.textContent = message;
};

const showApply = (show) => {
    if (applyButton) applyButton.hidden = !show;
};

const handleControllerChange = () => {
    setStatus('Update applied. Reloading…');
    window.location.reload();
};

const bindUpdateFlow = (registration) => {
    if (!registration) return;

    if (registration.waiting) {
        setStatus('Update ready to apply.');
        showApply(true);
    } else {
        setStatus('App is up to date.');
        showApply(false);
    }

    registration.addEventListener('updatefound', () => {
        setStatus('Update downloading…');
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                    setStatus('Update ready to apply.');
                    showApply(true);
                } else {
                    setStatus('App ready for offline use.');
                }
            }
        });
    });
};

const applyUpdate = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) return;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
};

const checkForUpdates = async () => {
    setStatus('Checking for updates…');
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
            setStatus('Service worker not ready yet.');
            return;
        }
        await registration.update();
        bindUpdateFlow(registration);
    } catch {
        setStatus('Unable to check for updates right now.');
    }
};

const registerBackgroundRefresh = async (registration) => {
    if (!registration) return;
    if ('periodicSync' in registration) {
        try {
            await registration.periodicSync.register('panda-refresh', {
                minInterval: 24 * 60 * 60 * 1000,
            });
            setSyncStatus('Background refresh enabled.');
            return;
        } catch {
            setSyncStatus('Background refresh blocked by the system.');
            return;
        }
    }

    if ('sync' in registration) {
        try {
            await registration.sync.register('panda-refresh');
            setSyncStatus('Background refresh queued for next online session.');
            return;
        } catch {
            setSyncStatus('Background refresh unavailable right now.');
            return;
        }
    }

    setSyncStatus('Background refresh not supported on this device.');
};

const init = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
        setStatus('Service worker not ready yet.');
        setSyncStatus('Background refresh will start once the app is installed.');
        if (updateButton) updateButton.disabled = true;
        return;
    }
    bindUpdateFlow(registration);
    registerBackgroundRefresh(registration);

    if (updateButton) {
        updateButton.addEventListener('click', checkForUpdates);
    }

    if (applyButton) {
        applyButton.addEventListener('click', applyUpdate);
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true });
};

whenReady(init);
