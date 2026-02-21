/**
 * Creates a controller for a single HTMLAudioElement playback slot.
 * Manages the audio element and any associated object URL that must be
 * revoked when playback stops.
 *
 * @returns {{ audio: HTMLAudioElement, stop: () => void, setUrl: (url: string) => void }}
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
        if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
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
