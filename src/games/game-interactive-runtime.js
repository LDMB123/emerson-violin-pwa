import { bindDocumentEvent, stopTonePlayer } from './shared.js';

/** Creates a token-based playback runtime for cancelable interactive game sequences. */
export const createPlaybackRuntime = ({
    onStop = null,
    stopToneOnStop = true,
} = {}) => {
    let token = 0;
    let playing = false;

    const nextToken = () => {
        token += 1;
        playing = true;
        return token;
    };

    const isCurrent = (candidate) => candidate === token;

    const stop = ({ stopTone = stopToneOnStop } = {}) => {
        token += 1;
        playing = false;
        if (typeof onStop === 'function') {
            onStop();
        }
        if (stopTone) {
            stopTonePlayer();
        }
    };

    const finish = (candidate) => {
        if (!isCurrent(candidate)) return false;
        playing = false;
        return true;
    };

    const setPlaying = (value) => {
        playing = Boolean(value);
    };

    return {
        nextToken,
        isCurrent,
        stop,
        finish,
        setPlaying,
        get playing() {
            return playing;
        },
    };
};

/** Binds visibilitychange handling for interactive runtime pause/resume behavior. */
export const bindVisibilityLifecycle = ({
    onHidden = null,
    onVisible = null,
    registerCleanup = null,
} = {}) => {
    const handler = () => {
        if (document.hidden) {
            if (typeof onHidden === 'function') onHidden();
            return;
        }
        if (typeof onVisible === 'function') onVisible();
    };

    return bindDocumentEvent('visibilitychange', handler, registerCleanup);
};
