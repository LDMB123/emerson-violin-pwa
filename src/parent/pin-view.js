export const getPinElements = () => {
    const dialog = document.querySelector('[data-pin-dialog]');
    const input = document.getElementById('parent-pin-input');
    const pinDisplayEl = document.querySelector('[data-parent-pin-display]');
    const pinInputEl = document.querySelector('[data-parent-pin-input]');
    const pinStatusEl = document.querySelector('[data-parent-pin-status]');
    return { dialog, input, pinDisplayEl, pinInputEl, pinStatusEl };
};

export const updatePinDisplay = () => {
    const { pinDisplayEl, pinStatusEl } = getPinElements();
    if (pinDisplayEl) {
        pinDisplayEl.textContent = '🔒 PIN ••••';
    }
    if (pinStatusEl) {
        pinStatusEl.textContent = 'PIN is set.';
    }
};

export const setPinStatus = (message) => {
    const { pinStatusEl } = getPinElements();
    if (pinStatusEl) pinStatusEl.textContent = message;
};

export const showPinDialog = () => {
    const { dialog, input } = getPinElements();
    if (!dialog) return;

    dialog.dataset.error = 'false';
    if (input) input.value = '';

    if (!dialog.open) {
        dialog.showModal();
        input?.focus();
    }
};

export const closePinDialog = (reason = '') => {
    const { dialog } = getPinElements();
    dialog?.close(reason);
};
