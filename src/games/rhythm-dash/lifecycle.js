import { GAME_PLAY_AGAIN, SOUNDS_CHANGE } from '../../utils/event-names.js';
import { isGameView } from '../../utils/view-hash-utils.js';

/** Creates the lifecycle registry for Rhythm Dash listeners and cleanup. */
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

        const stopRunToggle = ({ dispatchWhenUnchecked = false } = {}) => {
            if (!runToggle) return false;
            if (!runToggle.checked && !dispatchWhenUnchecked) return false;
            runToggle.checked = false;
            runToggle.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        };

        hashChangeHandler = () => {
            if (isGameView(window.location.hash, 'rhythm-dash')) {
                stopRunToggle({ dispatchWhenUnchecked: true });
                return;
            }
            if (!stopRunToggle()) {
                reportSession();
            }
        };
        window.addEventListener('hashchange', hashChangeHandler, { passive: true });

        resetRequestHandler = (event) => {
            const requestedViewId = event?.detail?.viewId;
            if (requestedViewId && requestedViewId !== 'view-game-rhythm-dash') return;
            if (!isGameView(window.location.hash, 'rhythm-dash')) return;
            stopRunToggle({ dispatchWhenUnchecked: true });
        };
        document.addEventListener(GAME_PLAY_AGAIN, resetRequestHandler);

        visibilityHandler = () => {
            if (document.hidden) {
                if (runToggle?.checked) {
                    setPausedByVisibility(true);
                    stopRunToggle();
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
            if (!isGameView(window.location.hash, 'rhythm-dash')) return;
            if (event?.persisted) return;
            if (stopRunToggle()) {
                return;
            }
            stopMetronome();
            reportSession();
        };
        window.addEventListener('pagehide', pagehideHandler, { passive: true });
    };

    return { bind, cleanup };
};
