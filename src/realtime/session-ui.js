import {
    init as initSessionController,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    getSessionState,
} from './session-controller.js';
import { RT_STATE, RT_FALLBACK, RT_SESSION_STARTED, RT_SESSION_STOPPED } from '../utils/event-names.js';

let bound = false;

const resolveControls = () => ({
    startButtons: Array.from(document.querySelectorAll('[data-rt-start]')),
    stopButtons: Array.from(document.querySelectorAll('[data-rt-stop]')),
    toggleButtons: Array.from(document.querySelectorAll('[data-rt-toggle]')),
    statusNodes: Array.from(document.querySelectorAll('[data-rt-status]')),
    indicators: Array.from(document.querySelectorAll('[data-rt-indicator]')),
});

const ensureTopbarIndicator = () => {
    const topbar = document.querySelector('.app-topbar');
    if (!topbar) return null;
    let chip = topbar.querySelector('[data-rt-indicator-topbar]');
    if (chip) return chip;
    chip = document.createElement('span');
    chip.className = 'rt-listening-chip';
    chip.dataset.rtIndicatorTopbar = 'true';
    chip.setAttribute('data-rt-indicator', '');
    chip.textContent = 'Mic off';
    topbar.appendChild(chip);
    return chip;
};

const writeStatus = (text, state = 'idle') => {
    const { statusNodes, indicators } = resolveControls();
    statusNodes.forEach((node) => {
        node.textContent = text;
    });
    indicators.forEach((node) => {
        node.textContent = text;
        node.dataset.state = state;
    });
};

const updateControlStates = () => {
    const session = getSessionState();
    const { startButtons, stopButtons, toggleButtons } = resolveControls();

    startButtons.forEach((button) => {
        button.disabled = session.active && !session.paused;
    });

    stopButtons.forEach((button) => {
        button.disabled = !session.active;
    });

    toggleButtons.forEach((button) => {
        if (!session.active) {
            button.textContent = 'Start Listening';
            button.dataset.state = 'idle';
            return;
        }
        if (session.paused) {
            button.textContent = 'Resume Listening';
            button.dataset.state = 'paused';
            return;
        }
        button.textContent = 'Pause Listening';
        button.dataset.state = 'active';
    });

    if (!session.active) {
        writeStatus('Mic off', 'idle');
        return;
    }
    if (session.paused) {
        writeStatus('Listening paused', 'paused');
        return;
    }
    writeStatus('Listening now', 'listening');
};

const bindButtons = () => {
    const { startButtons, stopButtons, toggleButtons } = resolveControls();

    startButtons.forEach((button) => {
        if (button.dataset.rtBound === 'true') return;
        button.dataset.rtBound = 'true';
        button.addEventListener('click', () => {
            startSession().then(() => updateControlStates());
        });
    });

    stopButtons.forEach((button) => {
        if (button.dataset.rtBound === 'true') return;
        button.dataset.rtBound = 'true';
        button.addEventListener('click', () => {
            stopSession('manual-stop').then(() => updateControlStates());
        });
    });

    toggleButtons.forEach((button) => {
        if (button.dataset.rtBound === 'true') return;
        button.dataset.rtBound = 'true';
        button.addEventListener('click', () => {
            const session = getSessionState();
            if (!session.active) {
                startSession().then(() => updateControlStates());
                return;
            }
            if (session.paused) {
                resumeSession().then(() => updateControlStates());
                return;
            }
            pauseSession().then(() => updateControlStates());
        });
    });
};

const bindGlobal = () => {
    if (bound) return;
    bound = true;

    document.addEventListener(RT_STATE, () => {
        updateControlStates();
    });

    document.addEventListener(RT_SESSION_STARTED, () => {
        writeStatus('Listening now', 'listening');
        updateControlStates();
    });

    document.addEventListener(RT_SESSION_STOPPED, () => {
        writeStatus('Mic off', 'idle');
        updateControlStates();
    });

    document.addEventListener(RT_FALLBACK, (event) => {
        const reason = event.detail?.reason || 'Need grown-up help to continue.';
        writeStatus(reason, 'fallback');
    });

    window.addEventListener('hashchange', () => {
        ensureTopbarIndicator();
        bindButtons();
        updateControlStates();
    }, { passive: true });
};

export const init = () => {
    initSessionController();
    ensureTopbarIndicator();
    bindButtons();
    bindGlobal();
    updateControlStates();
};
