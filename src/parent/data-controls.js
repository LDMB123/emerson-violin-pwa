import { confirmLocalDataDeletion, wipeAllLocalData } from './parent-data-reset.js';
import {
    createTextContentSetter,
    setDisabled,
} from '../utils/dom-utils.js';

let wipeButton = null;
let statusEl = null;

const resolveElements = () => {
    wipeButton = document.querySelector('[data-parent-wipe-data]');
    statusEl = document.querySelector('[data-parent-wipe-status]');
};

const resolveStatusElement = () => statusEl;
const setStatus = createTextContentSetter(resolveStatusElement);

const handleWipe = async () => {
    if (!confirmLocalDataDeletion()) {
        setStatus('Delete cancelled.');
        return;
    }

    setDisabled(wipeButton, true);
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
        setDisabled(wipeButton, false);
    }
};

const initDataControls = () => {
    resolveElements();
    if (!wipeButton) return;
    if (wipeButton.dataset.parentWipeBound === 'true') return;
    wipeButton.dataset.parentWipeBound = 'true';
    wipeButton.addEventListener('click', handleWipe);
};

/**
 * Initializes the parent-zone controls for wiping locally stored app data.
 */
export const init = initDataControls;
