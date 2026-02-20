import { confirmLocalDataDeletion, wipeAllLocalData } from './parent-data-reset.js';

let wipeButton = null;
let statusEl = null;

const resolveElements = () => {
    wipeButton = document.querySelector('[data-parent-wipe-data]');
    statusEl = document.querySelector('[data-parent-wipe-status]');
};

const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
};

const handleWipe = async () => {
    if (!confirmLocalDataDeletion()) {
        setStatus('Delete cancelled.');
        return;
    }

    if (wipeButton) wipeButton.disabled = true;
    setStatus('Deleting local data...');

    try {
        const result = await wipeAllLocalData();
        if (!result.ok && result.reason === 'blocked') {
            setStatus('Data clear blocked by another tab. Close other tabs and try again.');
            return;
        }

        setStatus('Local data removed. Reloading app...');
        window.setTimeout(() => {
            window.location.hash = '#view-home';
            window.location.reload();
        }, 500);
    } catch {
        setStatus('Unable to delete all data right now. Try again.');
    } finally {
        if (wipeButton) wipeButton.disabled = false;
    }
};

const initDataControls = () => {
    resolveElements();
    if (!wipeButton) return;
    if (wipeButton.dataset.parentWipeBound === 'true') return;
    wipeButton.dataset.parentWipeBound = 'true';
    wipeButton.addEventListener('click', handleWipe);
};

export const init = initDataControls;
