import { getJSON, setJSON, removeJSON } from '@core/persistence/storage.js';
import { getViewId, onViewChange } from '@core/utils/view-events.js';

const dialog = document.querySelector('[data-pin-dialog]');
const input = document.getElementById('parent-pin-input');
const form = dialog?.querySelector('form');
const pinDisplayEl = document.querySelector('[data-parent-pin-display]');
const pinInputEl = document.querySelector('[data-parent-pin-input]');
const pinSaveButton = document.querySelector('[data-parent-pin-save]');
const pinStatusEl = document.querySelector('[data-parent-pin-status]');

const PIN_KEY = 'panda-violin:parent-pin-v1';
const UNLOCK_KEY = 'panda-violin:parent-unlocked';
const UNLOCK_TTL = 2 * 60 * 60 * 1000;
let cachedPin = '1001';
let pinReady = null;

const normalizePin = (value) => (value || '').replace(/\D/g, '').slice(0, 4);

const updatePinDisplay = () => {
    if (pinDisplayEl) {
        const mask = cachedPin ? '•'.repeat(cachedPin.length) : '••••';
        pinDisplayEl.textContent = `🔒 PIN ${mask}`;
    }
    if (pinStatusEl) {
        pinStatusEl.textContent = 'PIN is set.';
    }
};

const loadPin = async () => {
    const stored = await getJSON(PIN_KEY);
    const loaded = normalizePin(stored?.pin) || '1001';
    cachedPin = loaded;
    updatePinDisplay();
    return cachedPin;
};

const getPin = async () => {
    if (!pinReady) {
        pinReady = loadPin();
    }
    await pinReady;
    return cachedPin;
};

const setPinStatus = (message) => {
    if (pinStatusEl) pinStatusEl.textContent = message;
};

const isUnlocked = async () => {
    const stored = await getJSON(UNLOCK_KEY);
    if (!stored?.unlocked) return false;
    if (stored.expiresAt && Date.now() > stored.expiresAt) {
        await removeJSON(UNLOCK_KEY);
        return false;
    }
    return true;
};

const showDialog = () => {
    if (!dialog) return;
    dialog.dataset.error = 'false';
    if (input) input.value = '';
    if (typeof dialog.showModal === 'function' && !dialog.open) {
        dialog.showModal();
        input?.focus();
    }
};

const unlock = async () => {
    await setJSON(UNLOCK_KEY, { unlocked: true, expiresAt: Date.now() + UNLOCK_TTL });
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
    const pin = await getPin();
    if (input?.value === pin) {
        await unlock();
        return;
    }
    if (dialog) dialog.dataset.error = 'true';
    if (input) {
        input.value = '';
        input.focus();
    }
};

const checkGate = async (viewId = null) => {
    const targetView = viewId || getViewId();
    if (targetView !== 'view-parent') return;
    if (await isUnlocked()) return;
    if (dialog && typeof dialog.showModal === 'function') {
        showDialog();
        return;
    }
    const entry = window.prompt('Enter Parent PIN');
    const pin = await getPin();
    if (entry === pin) {
        await setJSON(UNLOCK_KEY, { unlocked: true, expiresAt: Date.now() + UNLOCK_TTL });
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
    cachedPin = next;
    await setJSON(PIN_KEY, { pin: next, updatedAt: Date.now() });
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

onViewChange((viewId) => {
    checkGate(viewId);
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadPin();
        checkGate();
    });
} else {
    loadPin();
    checkGate();
}
