const stopAudioElement = (audio) => {
    if (!(audio instanceof HTMLMediaElement)) return;
    if (!audio.paused) {
        audio.pause();
    }
    audio.currentTime = 0;
};

const normalizeEntries = (source) => {
    if (!source) return [];
    if (Array.isArray(source)) return source;
    return Object.entries(source);
};

export const createAudioCueBank = (source) => {
    const cues = new Map(
        normalizeEntries(source).filter(([key, audio]) => Boolean(key) && audio instanceof HTMLMediaElement),
    );

    const get = (key) => cues.get(key) || null;

    const stop = (key) => {
        const audio = get(key);
        stopAudioElement(audio);
    };

    const stopAll = () => {
        cues.forEach((audio) => stopAudioElement(audio));
    };

    const play = async (key, { timeoutMs = 0, isCancelled = null } = {}) => {
        const audio = get(key);
        if (!audio) return false;
        if (typeof isCancelled === 'function' && isCancelled()) return false;

        audio.currentTime = 0;
        let playFailed = false;
        const playAttempt = audio.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
            await playAttempt.catch(() => {
                playFailed = true;
            });
        }
        if (playFailed) return false;
        if (!(timeoutMs > 0)) return true;

        await new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timerId);
                audio.removeEventListener('ended', finish);
                resolve();
            };
            const timerId = window.setTimeout(finish, timeoutMs);
            audio.addEventListener('ended', finish);
        });
        return true;
    };

    return {
        get,
        play,
        stop,
        stopAll,
    };
};
