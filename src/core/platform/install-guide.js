import { getJSON, setJSON } from '../persistence/storage.js';
import { isIPadOS, isStandalone } from './ipados.js';

const DISMISS_KEY = 'panda-violin:install-guide:v1';
const helpButton = document.querySelector('[data-install-help]');
const dialog = document.querySelector('#install-guide');
const banner = document.querySelector('#install-banner');
let lastFocused = null;
let closeBound = false;

const isAutomated = () => Boolean(navigator.webdriver);

const markDismissed = async () => {
    await setJSON(DISMISS_KEY, { dismissed: true, timestamp: Date.now() });
};

const wasDismissed = async () => {
    const data = await getJSON(DISMISS_KEY);
    return Boolean(data?.dismissed);
};

const bindDialogClose = () => {
    if (!dialog || closeBound) return;
    closeBound = true;
    dialog.addEventListener('close', async () => {
        if (dialog.returnValue === 'dismiss') {
            await markDismissed();
        }
        if (lastFocused instanceof HTMLElement) {
            lastFocused.focus();
        }
    });
};

const updateBannerVisibility = () => {
    if (!banner) return;
    const shouldShow = !isAutomated() && isIPadOS();
    banner.toggleAttribute('data-visible', shouldShow);
    if (!shouldShow && banner.open) {
        banner.open = false;
    }
};

const showGuide = async (force = false) => {
    updateBannerVisibility();
    if (isAutomated()) return;
    if (!isIPadOS()) {
        return;
    }

    if (isStandalone() && !force) {
        return;
    }

    if (!force && await wasDismissed()) return;
    if (!dialog || dialog.open || typeof dialog.showModal !== 'function') return;

    bindDialogClose();
    lastFocused = document.activeElement;
    dialog.showModal();
    requestAnimationFrame(() => {
        dialog.querySelector('[data-install-dismiss]')?.focus();
    });
};

const init = () => {
    updateBannerVisibility();
    if (isAutomated() || !isIPadOS()) {
        updateBannerVisibility();
        return;
    }

    if (helpButton) {
        helpButton.addEventListener('click', () => {
            showGuide(true);
        });
    }

    showGuide(false);

    window.addEventListener('appinstalled', () => {
        updateBannerVisibility();
        if (dialog?.open) dialog.close();
    });
    const media = window.matchMedia('(display-mode: standalone)');
    if (media?.addEventListener) {
        media.addEventListener('change', updateBannerVisibility);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
