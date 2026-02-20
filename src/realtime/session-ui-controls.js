const toFlag = (value) => (value ? '1' : '0');

const deriveToggleState = (session) => {
    if (!session.active) {
        return {
            label: 'Start Listening',
            state: 'idle',
        };
    }
    if (session.paused) {
        return {
            label: 'Resume Listening',
            state: 'paused',
        };
    }
    return {
        label: 'Pause Listening',
        state: 'active',
    };
};

const deriveStatus = (session) => {
    if (!session.active) {
        return {
            text: 'Mic off',
            state: 'idle',
        };
    }
    if (session.paused) {
        return {
            text: 'Listening paused',
            state: 'paused',
        };
    }
    return {
        text: 'Listening now',
        state: 'listening',
    };
};

export const createSessionUiControls = ({
    getSessionState,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
}) => {
    let controlsCache = null;
    let pendingRefreshFrame = 0;
    let lastControlStateKey = '';
    let lastStatusKey = '';

    const resolveControls = ({ refresh = false } = {}) => {
        if (refresh || !controlsCache) {
            controlsCache = {
                startButtons: Array.from(document.querySelectorAll('[data-rt-start]')),
                stopButtons: Array.from(document.querySelectorAll('[data-rt-stop]')),
                toggleButtons: Array.from(document.querySelectorAll('[data-rt-toggle]')),
                statusNodes: Array.from(document.querySelectorAll('[data-rt-status]')),
                indicators: Array.from(document.querySelectorAll('[data-rt-indicator]')),
            };
        }
        return controlsCache;
    };

    const invalidateControls = () => {
        controlsCache = null;
        lastControlStateKey = '';
        lastStatusKey = '';
    };

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
        const statusKey = `${state}|${text}`;
        if (statusKey === lastStatusKey) return;
        lastStatusKey = statusKey;

        const { statusNodes, indicators } = resolveControls();
        statusNodes.forEach((node) => {
            node.textContent = text;
        });
        indicators.forEach((node) => {
            node.textContent = text;
            node.dataset.state = state;
        });
    };

    const updateControlStates = (force = false) => {
        const session = getSessionState();
        const { startButtons, stopButtons, toggleButtons } = resolveControls();
        const controlStateKey = `${toFlag(session.active)}|${toFlag(session.paused)}|${toFlag(session.listening)}`;
        if (!force && controlStateKey === lastControlStateKey) return;
        lastControlStateKey = controlStateKey;

        startButtons.forEach((button) => {
            button.disabled = session.active && !session.paused;
        });

        stopButtons.forEach((button) => {
            button.disabled = !session.active;
        });

        const toggleState = deriveToggleState(session);
        toggleButtons.forEach((button) => {
            button.textContent = toggleState.label;
            button.dataset.state = toggleState.state;
        });

        const status = deriveStatus(session);
        writeStatus(status.text, status.state);
    };

    const scheduleControlRefresh = (force = false) => {
        if (force) {
            if (pendingRefreshFrame) {
                window.cancelAnimationFrame(pendingRefreshFrame);
                pendingRefreshFrame = 0;
            }
            updateControlStates(true);
            return;
        }

        if (pendingRefreshFrame) return;
        pendingRefreshFrame = window.requestAnimationFrame(() => {
            pendingRefreshFrame = 0;
            updateControlStates();
        });
    };

    const bindClickOnce = (buttons, handler) => {
        buttons.forEach((button) => {
            if (button.dataset.rtBound === 'true') return;
            button.dataset.rtBound = 'true';
            button.addEventListener('click', handler);
        });
    };

    const bindButtons = () => {
        const { startButtons, stopButtons, toggleButtons } = resolveControls();

        bindClickOnce(startButtons, () => {
            startSession().then(() => updateControlStates(true));
        });

        bindClickOnce(stopButtons, () => {
            stopSession('manual-stop').then(() => updateControlStates(true));
        });

        bindClickOnce(toggleButtons, () => {
            const session = getSessionState();
            if (!session.active) {
                startSession().then(() => updateControlStates(true));
                return;
            }
            if (session.paused) {
                resumeSession().then(() => updateControlStates(true));
                return;
            }
            pauseSession().then(() => updateControlStates(true));
        });
    };

    return {
        ensureTopbarIndicator,
        invalidateControls,
        writeStatus,
        bindButtons,
        scheduleControlRefresh,
    };
};
