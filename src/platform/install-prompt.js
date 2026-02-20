import { isAutomated, isStandalone } from './platform-utils.js';

export const INSTALL_PROMPT_CHANGE_EVENT = 'panda:install-prompt-change';

let deferredPrompt = null;
let globalsBound = false;

const dispatchChange = () => {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(new CustomEvent(INSTALL_PROMPT_CHANGE_EVENT, {
        detail: {
            available: Boolean(deferredPrompt),
        },
    }));
};

const bindGlobals = () => {
    if (globalsBound) return;
    if (typeof window === 'undefined') return;
    globalsBound = true;

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event;
        dispatchChange();
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        dispatchChange();
    });
};

export const canPromptInstall = () => {
    if (isAutomated()) return false;
    if (isStandalone()) return false;
    return Boolean(deferredPrompt);
};

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

export const init = initInstallPrompt;

initInstallPrompt();
