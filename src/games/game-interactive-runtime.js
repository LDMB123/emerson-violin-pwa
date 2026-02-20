import { stopTonePlayer } from './shared.js';

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

    document.addEventListener('visibilitychange', handler);
    const cleanup = () => {
        document.removeEventListener('visibilitychange', handler);
    };
    if (typeof registerCleanup === 'function') {
        registerCleanup(cleanup);
    }
    return cleanup;
};
