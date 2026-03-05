import { isAutomated, isStandalone } from './platform-utils.js';
import { emitEvent } from '../utils/event-names.js';

/**
 * Fired when install prompt availability changes.
 *
 * @type {string}
 */
export const INSTALL_PROMPT_CHANGE_EVENT = 'panda:install-prompt-change';

let deferredPrompt = null;
let globalsBound = false;

const dispatchChange = () => {
    if (typeof document === 'undefined') return;
    emitEvent(INSTALL_PROMPT_CHANGE_EVENT, {
        available: Boolean(deferredPrompt),
    });
};

const bindGlobals = () => {
    const hasWindow = typeof window !== 'undefined';
    if (!hasWindow || globalsBound) return;
    globalsBound = true;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        dispatchChange();
    });

    const clearDeferredPrompt = () => {
        deferredPrompt = null;
        dispatchChange();
    };
    window.addEventListener('appinstalled', clearDeferredPrompt);
};

/**
 * Returns whether the app can currently show the browser install prompt.
 *
 * @returns {boolean}
 */
export const canPromptInstall = () => {
    if (isAutomated()) return false;
    if (isStandalone()) return false;
    return Boolean(deferredPrompt);
};

/**
 * Shows the saved install prompt when available and reports the outcome.
 *
 * @returns {Promise<{ prompted: boolean, accepted: boolean, outcome: string }>}
 */
export const promptInstall = async () => {
    if (!canPromptInstall()) {
        return {
            prompted: false,
            accepted: false,
            outcome: 'unavailable',
        };
    }

    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    dispatchChange();

    try {
        await promptEvent.prompt?.();
    } catch {
        // Some browsers may reject if prompt cannot be shown.
    }

    let outcome = 'unknown';
    try {
        const choice = await promptEvent.userChoice;
        if (typeof choice?.outcome === 'string') {
            outcome = choice.outcome;
        }
    } catch {
        // Ignore userChoice failures and use unknown outcome.
    }

    return {
        prompted: true,
        accepted: outcome === 'accepted',
        outcome,
    };
};

const initInstallPrompt = () => {
    if (isAutomated()) return;
    bindGlobals();
    dispatchChange();
};

/**
 * Initializes install-prompt listeners and emits the current availability.
 *
 * @returns {void}
 */
export const init = initInstallPrompt;

initInstallPrompt();
