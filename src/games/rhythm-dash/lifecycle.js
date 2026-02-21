import { GAME_PLAY_AGAIN, SOUNDS_CHANGE } from '../../utils/event-names.js';

export const createRhythmDashLifecycle = () => {
    let resetRequestHandler = null;
    let hashChangeHandler = null;
    let visibilityHandler = null;
    let soundsChangeHandler = null;
    let pagehideHandler = null;

    const cleanup = () => {
        if (resetRequestHandler) {
            document.removeEventListener(GAME_PLAY_AGAIN, resetRequestHandler);
            resetRequestHandler = null;
        }
        if (hashChangeHandler) {
            window.removeEventListener('hashchange', hashChangeHandler, { passive: true });
            hashChangeHandler = null;
        }
        if (visibilityHandler) {
            document.removeEventListener('visibilitychange', visibilityHandler);
            visibilityHandler = null;
        }
        if (soundsChangeHandler) {
            document.removeEventListener(SOUNDS_CHANGE, soundsChangeHandler);
            soundsChangeHandler = null;
        }
        if (pagehideHandler) {
            window.removeEventListener('pagehide', pagehideHandler, { passive: true });
            pagehideHandler = null;
        }
    };

    const bind = ({
        runToggle,
        reportSession,
        setStatus,
        getPausedByVisibility,
        setPausedByVisibility,
        startMetronome,
        stopMetronome,
    }) => {
        cleanup();

        hashChangeHandler = () => {
            if (window.location.hash === '#view-game-rhythm-dash') {
                if (runToggle) {
                    runToggle.checked = false;
                    runToggle.dispatchEvent(new Event('change', { bubbles: true }));
                }
                return;
            }
            if (runToggle?.checked) {
                runToggle.checked = false;
                runToggle.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                reportSession();
            }
        };
        window.addEventListener('hashchange', hashChangeHandler, { passive: true });

        resetRequestHandler = (event) => {
            const requestedViewId = event?.detail?.viewId;
            if (requestedViewId && requestedViewId !== 'view-game-rhythm-dash') return;
            if (window.location.hash !== '#view-game-rhythm-dash') return;
            if (runToggle) {
                runToggle.checked = false;
                runToggle.dispatchEvent(new Event('change', { bubbles: true }));
            }
        };
        document.addEventListener(GAME_PLAY_AGAIN, resetRequestHandler);

        visibilityHandler = () => {
            if (document.hidden) {
                if (runToggle?.checked) {
                    setPausedByVisibility(true);
                    runToggle.checked = false;
                    runToggle.dispatchEvent(new Event('change', { bubbles: true }));
                    setStatus('Paused while app is in the background.');
                }
            } else if (getPausedByVisibility()) {
                setPausedByVisibility(false);
                setStatus('Run paused. Tap Start to resume.');
            }
        };
        document.addEventListener('visibilitychange', visibilityHandler);

        soundsChangeHandler = (event) => {
            if (event.detail?.enabled === false) {
                stopMetronome();
            } else if (runToggle?.checked) {
                startMetronome();
            }
        };
        document.addEventListener(SOUNDS_CHANGE, soundsChangeHandler);

        pagehideHandler = (event) => {
            if (window.location.hash !== '#view-game-rhythm-dash') return;
            if (event?.persisted) return;
            if (runToggle?.checked) {
                runToggle.checked = false;
                runToggle.dispatchEvent(new Event('change', { bubbles: true }));
                return;
            }
            stopMetronome();
            reportSession();
        };
        window.addEventListener('pagehide', pagehideHandler, { passive: true });
    };

    return { bind, cleanup };
};
