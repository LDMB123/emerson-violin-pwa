const dialog = document.querySelector('[data-pin-dialog]');
const input = document.getElementById('parent-pin-input');
const form = dialog?.querySelector('form');

const PIN = '1001';
const UNLOCK_KEY = 'panda-violin:parent-unlocked';

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

const handleSubmit = (event) => {
    event.preventDefault();
    const action = event.submitter?.value;
    if (action === 'cancel') {
        dialog?.close('cancel');
        if (window.location.hash === '#view-parent') {
            window.location.hash = '#view-home';
        }
        return;
    }
    if (input?.value === PIN) {
        unlock();
        return;
    }
    if (dialog) dialog.dataset.error = 'true';
    if (input) {
        input.value = '';
        input.focus();
    }
};

const checkGate = () => {
    if (window.location.hash !== '#view-parent') return;
    if (isUnlocked()) return;
    if (dialog && typeof dialog.showModal === 'function') {
        showDialog();
        return;
    }
    const entry = window.prompt('Enter Parent PIN');
    if (entry === PIN) {
        sessionStorage.setItem(UNLOCK_KEY, 'true');
    } else {
        window.location.hash = '#view-home';
    }
};

if (form) {
    form.addEventListener('submit', handleSubmit);
}

window.addEventListener('hashchange', checkGate, { passive: true });

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkGate);
} else {
    checkGate();
}
