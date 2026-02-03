import { getJSON, setJSON, removeJSON } from '@core/persistence/storage.js';
import { getViewId, onViewChange } from '@core/utils/view-events.js';

const dialog = document.querySelector('[data-pin-dialog]');
const input = document.getElementById('parent-pin-input');
const form = dialog?.querySelector('form');
const pinDisplayEl = document.querySelector('[data-parent-pin-display]');
const pinInputEl = document.querySelector('[data-parent-pin-input]');
const pinSaveButton = document.querySelector('[data-parent-pin-save]');
const pinStatusEl = document.querySelector('[data-parent-pin-status]');
const parentEntryEl = document.querySelector('[data-parent-entry]');
const parentGateStatusEl = document.querySelector('[data-parent-gate-status]');

const PIN_KEY = 'panda-violin:parent-pin-v1';
const UNLOCK_KEY = 'panda-violin:parent-unlocked';
const UNLOCK_TTL = 2 * 60 * 60 * 1000;
const HOLD_MS = 900;
const HINT_MS = 2400;
let cachedPin = '1001';
let pinReady = null;
let holdTimer = null;
let hintTimer = null;
let holdTriggered = false;
let holdResetTimer = null;

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

const showParentGateHint = (message) => {
    if (!parentGateStatusEl) return;
    parentGateStatusEl.textContent = message;
    parentGateStatusEl.dataset.visible = 'true';
    if (hintTimer) window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => {
        parentGateStatusEl.textContent = '';
        parentGateStatusEl.dataset.visible = 'false';
    }, HINT_MS);
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

if (parentEntryEl) {
    parentEntryEl.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        holdTriggered = false;
        if (holdTimer) window.clearTimeout(holdTimer);
        holdTimer = window.setTimeout(() => {
            holdTriggered = true;
            if (holdResetTimer) window.clearTimeout(holdResetTimer);
            holdResetTimer = window.setTimeout(() => {
                holdTriggered = false;
            }, 3000);
            showParentGateHint('Opening Parent Zone...');
        }, HOLD_MS);
    });

    const cancelHold = () => {
        if (holdTimer) window.clearTimeout(holdTimer);
        holdTimer = null;
    };

    parentEntryEl.addEventListener('pointerup', cancelHold);
    parentEntryEl.addEventListener('pointercancel', cancelHold);
    parentEntryEl.addEventListener('pointerleave', cancelHold);
    parentEntryEl.addEventListener('contextmenu', (event) => event.preventDefault());

    parentEntryEl.addEventListener('click', (event) => {
        if (!holdTriggered) {
            event.preventDefault();
            event.stopPropagation();
            showParentGateHint('Hold to open Parent Zone.');
            return;
        }
        holdTriggered = false;
        if (holdResetTimer) window.clearTimeout(holdResetTimer);
    });

    parentEntryEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            holdTriggered = true;
        }
    });
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
