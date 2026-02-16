import { getJSON, setJSON } from '../persistence/storage.js';

const dialog = document.querySelector('[data-pin-dialog]');
const input = document.getElementById('parent-pin-input');
const form = dialog?.querySelector('form');
const pinDisplayEl = document.querySelector('[data-parent-pin-display]');
const pinInputEl = document.querySelector('[data-parent-pin-input]');
const pinSaveButton = document.querySelector('[data-parent-pin-save]');
const pinStatusEl = document.querySelector('[data-parent-pin-status]');

const PIN_KEY = 'panda-violin:parent-pin-v1';
const UNLOCK_KEY = 'panda-violin:parent-unlocked';
let cachedHash = null;
let pinReady = null;

const normalizePin = (value) => (value || '').replace(/\D/g, '').slice(0, 4);

const hashPin = async (pin) => {
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
    const stored = await getJSON(PIN_KEY);
    if (stored?.hash) {
        cachedHash = stored.hash;
    } else {
        const plain = normalizePin(stored?.pin) || '1001';
        cachedHash = await hashPin(plain);
        await setJSON(PIN_KEY, { hash: cachedHash, updatedAt: Date.now() });
    }
    updatePinDisplay();
    return cachedHash;
};

const getPinHash = async () => {
    if (!pinReady) {
        pinReady = loadPin();
    }
    await pinReady;
    return cachedHash;
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
    const stored = await getPinHash();
    const entered = await hashPin(normalizePin(input?.value));
    if (entered === stored) {
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
    const stored = await getPinHash();
    const entered = await hashPin(normalizePin(entry));
    if (entered === stored) {
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
    cachedHash = await hashPin(next);
    await setJSON(PIN_KEY, { hash: cachedHash, updatedAt: Date.now() });
    pinInputEl.value = '';
    updatePinDisplay();
    setPinStatus('PIN updated.');
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
