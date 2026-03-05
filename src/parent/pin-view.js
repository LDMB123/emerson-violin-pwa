/** Resolves the DOM elements used by the parent PIN dialog and summary UI. */
/** Returns the DOM elements used by the parent PIN UI. */
export const getPinElements = () => {
    const dialog = document.querySelector('[data-pin-dialog]');
    const input = document.getElementById('parent-pin-input');
    const pinDisplayEl = document.querySelector('[data-parent-pin-display]');
    const pinInputEl = document.querySelector('[data-parent-pin-input]');
    const pinStatusEl = document.querySelector('[data-parent-pin-status]');
    return { dialog, input, pinDisplayEl, pinInputEl, pinStatusEl };
};

/** Resets the parent PIN summary display to its masked default state. */
/** Refreshes the visible parent PIN summary state. */
export const updatePinDisplay = () => {
    const { pinDisplayEl, pinStatusEl } = getPinElements();
    if (pinDisplayEl) {
        pinDisplayEl.textContent = '🔒 PIN ••••';
    }
    if (pinStatusEl) {
        pinStatusEl.textContent = 'PIN is set.';
    }
};

/** Updates the status text shown alongside the parent PIN controls. */
/** Updates the parent PIN status message. */
export const setPinStatus = (message) => {
    const { pinStatusEl } = getPinElements();
    if (pinStatusEl) pinStatusEl.textContent = message;
};

/** Opens the parent PIN dialog and clears any stale error/input state. */
/** Opens the parent PIN dialog and resets its input state. */
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

/** Closes the parent PIN dialog with an optional dialog return reason. */
/** Closes the parent PIN dialog with an optional reason. */
export const closePinDialog = (reason = '') => {
    const { dialog } = getPinElements();
    dialog?.close(reason);
};
