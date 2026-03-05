/**
 * Stops an audio element and rewinds it to the beginning.
 *
 * @param {HTMLMediaElement | null | undefined} audio
 * @returns {void}
 */
export const stopAndResetAudioElement = (audio) => {
    if (!audio || typeof audio.pause !== 'function') return;
    if (!audio.paused) {
        audio.pause();
    }
    audio.currentTime = 0;
};

/**
 * Creates a controller for a single audio playback slot.
 *
 * @returns {{
 *   audio: HTMLAudioElement,
 *   stop: () => void,
 *   setUrl: (url: string) => void,
 *   playSource: (source: { url?: string, revoke?: boolean }) => Promise<void>
 * }}
 */
export const createAudioController = () => {
    const audio = new Audio();
    audio.preload = 'none';
    let currentUrl = '';
    const isBlobUrl = (url) => typeof url === 'string' && url.startsWith('blob:');
    const revokeCurrentUrl = () => {
        if (!isBlobUrl(currentUrl)) return;
        URL.revokeObjectURL(currentUrl);
    };

    const stop = () => {
        stopAndResetAudioElement(audio);
        revokeCurrentUrl();
        currentUrl = '';
    };

    const setUrl = (url) => {
        const nextUrl = typeof url === 'string' ? url : '';
        if (nextUrl !== currentUrl) {
            revokeCurrentUrl();
        }
        currentUrl = nextUrl;
    };

    const playSource = async (source) => {
        if (!source || !source.url) return;
        stop();
        setUrl(source.revoke ? source.url : '');
        audio.src = source.url;
        if (source.revoke) {
            audio.addEventListener('ended', stop, { once: true });
        }
        await audio.play().catch(() => { });
    };

    return { audio, stop, setUrl, playSource };
};
