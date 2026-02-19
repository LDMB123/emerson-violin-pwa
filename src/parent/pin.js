import { getJSON, setJSON } from '../persistence/storage.js';
import { createPinHash, verifyPin } from './pin-crypto.js';
import {
    PARENT_PIN_KEY as PIN_KEY,
    PARENT_PIN_LEGACY_KEY as PIN_KEY_LEGACY,
    PARENT_UNLOCK_KEY as UNLOCK_KEY,
} from '../persistence/storage-keys.js';

let cachedPinData = null;
let pinReady = null;
let listenersBound = false;

const normalizePin = (value) => (value || '').replace(/\D/g, '').slice(0, 4);

const getElements = () => {
    const dialog = document.querySelector('[data-pin-dialog]');
    const input = document.getElementById('parent-pin-input');
    const pinDisplayEl = document.querySelector('[data-parent-pin-display]');
    const pinInputEl = document.querySelector('[data-parent-pin-input]');
    const pinStatusEl = document.querySelector('[data-parent-pin-status]');
    return { dialog, input, pinDisplayEl, pinInputEl, pinStatusEl };
};

const updatePinDisplay = () => {
    const { pinDisplayEl, pinStatusEl } = getElements();
    if (pinDisplayEl) {
        pinDisplayEl.textContent = '🔒 PIN ••••';
    }
    if (pinStatusEl) {
        pinStatusEl.textContent = 'PIN is set.';
    }
};

const setPinStatus = (message) => {
    const { pinStatusEl } = getElements();
    if (pinStatusEl) pinStatusEl.textContent = message;
};

const loadPin = async () => {
    let stored = await getJSON(PIN_KEY);

    if (stored?.hash && stored?.salt) {
        cachedPinData = stored;
    } else {
        const legacy = await getJSON(PIN_KEY_LEGACY);
        if (legacy?.hash) {
            const defaultPin = '1001';
            const { hash, salt } = await createPinHash(defaultPin);
            cachedPinData = {
                hash,
                salt,
                createdAt: Date.now(),
                migrated: true,
            };
            await setJSON(PIN_KEY, cachedPinData);
        } else {
            const defaultPin = '1001';
            const { hash, salt } = await createPinHash(defaultPin);
            cachedPinData = {
                hash,
                salt,
                createdAt: Date.now(),
            };
            await setJSON(PIN_KEY, cachedPinData);
        }
    }

    updatePinDisplay();
    return cachedPinData;
};

const getPinData = async () => {
    if (!pinReady) {
        pinReady = loadPin();
    }
    await pinReady;
    return cachedPinData;
};

const isUnlocked = () => sessionStorage.getItem(UNLOCK_KEY) === 'true';

const showDialog = () => {
    const { dialog, input } = getElements();
    if (!dialog) return;

    dialog.dataset.error = 'false';
    if (input) input.value = '';

    if (!dialog.open) {
        dialog.showModal();
        input?.focus();
    }
};

const unlock = () => {
    const { dialog } = getElements();
    sessionStorage.setItem(UNLOCK_KEY, 'true');
    dialog?.close('ok');
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
    const { pinInputEl } = getElements();
    if (!pinInputEl) return;

    const next = normalizePin(pinInputEl.value);
    if (next.length !== 4) {
        setPinStatus('Enter a 4-digit PIN.');
        return;
    }

    const { hash, salt } = await createPinHash(next);
    cachedPinData = {
        hash,
        salt,
        updatedAt: Date.now(),
    };
    await setJSON(PIN_KEY, cachedPinData);
    pinInputEl.value = '';
    updatePinDisplay();
    setPinStatus('PIN updated (secure).');
};

const checkGate = () => {
    if (window.location.hash !== '#view-parent') return;
    if (isUnlocked()) return;
    showDialog();
};

const bindGlobalListeners = () => {
    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener('submit', (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        if (!form.closest('[data-pin-dialog]')) return;
        handleSubmit(event);
    });

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-parent-pin-save]');
        if (!button) return;
        savePin();
    });

    document.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.id !== 'parent-pin-input' && !target.matches('[data-parent-pin-input]')) return;
        target.value = normalizePin(target.value);
    });

    window.addEventListener('hashchange', checkGate, { passive: true });
};

const initParentPin = async () => {
    bindGlobalListeners();
    await loadPin();
    checkGate();
};

export const init = initParentPin;
