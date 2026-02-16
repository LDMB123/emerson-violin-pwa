import { getJSON, setJSON } from '../persistence/storage.js';
import { createPinHash, verifyPin } from './pin-crypto.js';

const dialog = document.querySelector('[data-pin-dialog]');
const input = document.getElementById('parent-pin-input');
const form = dialog?.querySelector('form');
const pinDisplayEl = document.querySelector('[data-parent-pin-display]');
const pinInputEl = document.querySelector('[data-parent-pin-input]');
const pinSaveButton = document.querySelector('[data-parent-pin-save]');
const pinStatusEl = document.querySelector('[data-parent-pin-status]');

const PIN_KEY = 'panda-violin:parent-pin-v2'; // Changed to v2 for PBKDF2
const PIN_KEY_LEGACY = 'panda-violin:parent-pin-v1'; // Old SHA-256 version
const UNLOCK_KEY = 'panda-violin:parent-unlocked';
let cachedPinData = null;
let pinReady = null;

const normalizePin = (value) => (value || '').replace(/\D/g, '').slice(0, 4);

// Legacy SHA-256 hash for migration
const hashPinLegacy = async (pin) => {
    const data = new TextEncoder().encode(pin);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

const updatePinDisplay = () => {
    if (pinDisplayEl) {
        pinDisplayEl.textContent = '🔒 PIN ••••';
    }
    if (pinStatusEl) {
        pinStatusEl.textContent = 'PIN is set.';
    }
};

const loadPin = async () => {
    // Try new PBKDF2 format first
    let stored = await getJSON(PIN_KEY);

    if (stored?.hash && stored?.salt) {
        // Valid PBKDF2 format
        cachedPinData = stored;
    } else {
        // Try legacy v1 format for migration
        const legacy = await getJSON(PIN_KEY_LEGACY);
        if (legacy?.hash) {
            // Cannot migrate without original PIN, set default
            console.warn('[PIN] Legacy format detected, resetting to default');
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
            // No PIN set, create default 1001
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

const setPinStatus = (message) => {
    if (pinStatusEl) pinStatusEl.textContent = message;
};

const isUnlocked = () => sessionStorage.getItem(UNLOCK_KEY) === 'true';

const showDialog = () => {
    if (!dialog) return;
    dialog.dataset.error = 'false';
    if (input) input.value = '';
    if (typeof dialog.showModal === 'function' && !dialog.open) {
        dialog.showModal();
        input?.focus();
    }
};

const unlock = () => {
    sessionStorage.setItem(UNLOCK_KEY, 'true');
    dialog?.close('ok');
};

const handleSubmit = async (event) => {
    event.preventDefault();
    const action = event.submitter?.value;
    if (action === 'cancel') {
        dialog?.close('cancel');
        if (window.location.hash === '#view-parent') {
            window.location.hash = '#view-home';
        }
        return;
    }
    const pinData = await getPinData();
    const enteredPin = normalizePin(input?.value);
    const isValid = await verifyPin(enteredPin, pinData.hash, pinData.salt);

    if (isValid) {
        unlock();
        return;
    }
    if (dialog) dialog.dataset.error = 'true';
    if (input) {
        input.value = '';
        input.focus();
    }
};

const checkGate = async () => {
    if (window.location.hash !== '#view-parent') return;
    if (isUnlocked()) return;
    if (dialog && typeof dialog.showModal === 'function') {
        showDialog();
        return;
    }
    const entry = window.prompt('Enter Parent PIN');
    const pinData = await getPinData();
    const enteredPin = normalizePin(entry);
    const isValid = await verifyPin(enteredPin, pinData.hash, pinData.salt);

    if (isValid) {
        sessionStorage.setItem(UNLOCK_KEY, 'true');
    } else {
        window.location.hash = '#view-home';
    }
};

if (form) {
    form.addEventListener('submit', handleSubmit);
}

const savePin = async () => {
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

if (pinInputEl) {
    pinInputEl.addEventListener('input', () => {
        pinInputEl.value = normalizePin(pinInputEl.value);
    });
}

if (pinSaveButton) {
    pinSaveButton.addEventListener('click', savePin);
}

window.addEventListener('hashchange', checkGate, { passive: true });

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadPin();
        checkGate();
    });
} else {
    loadPin();
    checkGate();
}
