/**
 * Install Toast — slide-up prompt shown once to non-installed users.
 *
 * - Appears 5 s after first load (if not standalone & not dismissed)
 * - Auto-dismisses after 8 s if user doesn't interact
 * - "Install" CTA opens the full install guide dialog
 * - Adds a pulsing dot on the Parent Zone lock while install is available
 */

import { INSTALL_TOAST_KEY as DISMISS_KEY } from '../persistence/storage-keys.js';
import { isStandalone, isAutomated } from './platform-utils.js';
import { markDismissed, wasDismissed } from './dismiss-helpers.js';
const SHOW_DELAY = 5000;
const AUTO_DISMISS = 8000;

const toast = document.getElementById('install-toast');
const actionBtn = toast?.querySelector('[data-install-toast-action]');
const closeBtn = toast?.querySelector('.install-toast-close');
const parentLockButton = document.querySelector('[data-parent-lock]');

let autoDismissTimer = null;

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const hideToast = () => {
    if (!toast) return;
    toast.hidden = true;
    toast.classList.remove('is-visible', 'is-leaving');
};

const dismiss = async (persist = true) => {
    if (autoDismissTimer) {
        clearTimeout(autoDismissTimer);
        autoDismissTimer = null;
    }

    if (prefersReducedMotion()) {
        // Animation is disabled — hide immediately
        hideToast();
    } else {
        toast?.classList.add('is-leaving');
        toast?.addEventListener('animationend', hideToast, { once: true });
        // Safety fallback: hide after 500ms if animationend never fires
        setTimeout(hideToast, 500);
    }

    if (persist) {
        await markDismissed(DISMISS_KEY);
        removePulsingDot();
    }
};

const show = () => {
    if (!toast) return;
    toast.hidden = false;
    // Force reflow so the entrance animation plays
    void toast.offsetHeight;
    toast.classList.add('is-visible');

    autoDismissTimer = setTimeout(() => dismiss(false), AUTO_DISMISS);
};

// Pulsing dot on Parent Zone lock
const addPulsingDot = () => {
    if (!parentLockButton || parentLockButton.querySelector('.nav-pulse')) return;
    const dot = document.createElement('span');
    dot.className = 'nav-pulse';
    dot.setAttribute('aria-hidden', 'true');
    parentLockButton.appendChild(dot);
};

const removePulsingDot = () => {
    parentLockButton?.querySelector('.nav-pulse')?.remove();
};

// Wire events
actionBtn?.addEventListener('click', async () => {
    await dismiss(true);
    // Open the full install guide dialog from anywhere in the app.
    const { openInstallGuide } = await import('./install-guide.js');
    openInstallGuide();
});

closeBtn?.addEventListener('click', () => dismiss(true));

// Init
const init = async () => {
    if (isAutomated() || isStandalone()) return;
    if (await wasDismissed(DISMISS_KEY)) return;

    addPulsingDot();
    setTimeout(show, SHOW_DELAY);
};

init();
