import { verifyPin } from './pin-crypto.js';
import {
    PARENT_PIN_KEY as PIN_KEY,
    PARENT_PIN_LEGACY_KEY as PIN_KEY_LEGACY,
    PARENT_UNLOCK_KEY as UNLOCK_KEY,
} from '../persistence/storage-keys.js';
import {
    loadPinData,
    savePinData,
    normalizePin,
    isParentUnlocked,
    markParentUnlocked,
} from './pin-state.js';
import {
    closePinDialog,
    getPinElements,
    setPinStatus,
    showPinDialog,
    updatePinDisplay,
} from './pin-view.js';
import { getMatchingInputTarget } from '../utils/dom-utils.js';

let cachedPinData = null;
let pinReady = null;
let listenersBound = false;

const loadPin = async () => {
    cachedPinData = await loadPinData({
        pinKey: PIN_KEY,
        legacyPinKey: PIN_KEY_LEGACY,
    });
    updatePinDisplay(Boolean(cachedPinData?.hash && cachedPinData?.salt));
    return cachedPinData;
};

const getPinData = async () => {
    if (!pinReady) {
        pinReady = loadPin();
    }
    await pinReady;
    return cachedPinData;
};

const unlock = () => {
    markParentUnlocked(UNLOCK_KEY);
    closePinDialog('ok');
};

const handleSubmit = async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const dialog = form.closest('[data-pin-dialog]');
    if (!(dialog instanceof HTMLDialogElement)) return;

    event.preventDefault();
    const action = event.submitter?.value;
    const input = dialog.querySelector('#parent-pin-input');

    if (action === 'cancel') {
        dialog.close('cancel');
        if (window.location.hash === '#view-parent') {
            window.location.hash = '#view-home';
        }
        return;
    }

    const pinData = await getPinData();
    if (!pinData?.hash || !pinData?.salt) {
        unlock();
        return;
    }
    const enteredPin = normalizePin(input?.value);
    const valid = await verifyPin(enteredPin, pinData.hash, pinData.salt);

    if (valid) {
        unlock();
        return;
    }

    dialog.dataset.error = 'true';
    if (input) {
        input.value = '';
        input.focus();
    }
};

const savePin = async () => {
    const { pinInputEl } = getPinElements();
    if (!pinInputEl) return;

    const next = normalizePin(pinInputEl.value);
    if (next.length !== 4) {
        setPinStatus('Enter a 4-digit PIN.');
        return;
    }

    cachedPinData = await savePinData({
        pinKey: PIN_KEY,
        pin: next,
    });
    pinInputEl.value = '';
    updatePinDisplay();
    setPinStatus('PIN updated (secure).');
};

const checkGate = () => {
    if (window.location.hash !== '#view-parent') return;
    if (isParentUnlocked(UNLOCK_KEY)) return;
    void getPinData().then((pinData) => {
        if (!pinData?.hash || !pinData?.salt) return;
        showPinDialog();
    });
};

const bindGlobalListeners = () => {
    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener('submit', handleSubmit);

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-parent-pin-save]');
        if (!button) return;
        savePin();
    });

    document.addEventListener('input', (event) => {
        const target = getMatchingInputTarget(event.target, {
            id: 'parent-pin-input',
            selector: '[data-parent-pin-input]',
        });
        if (!target) return;
        target.value = normalizePin(target.value);
    });

    window.addEventListener('hashchange', checkGate, { passive: true });
};

const initParentPin = async () => {
    bindGlobalListeners();
    await loadPin();
    checkGate();
};

/**
 * Initializes the parent PIN gate, save flow, and unlock handling.
 */
export const init = initParentPin;
