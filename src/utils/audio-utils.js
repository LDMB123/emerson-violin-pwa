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

    const stop = () => {
        if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
        if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
            currentUrl = '';
        }
    };

    const setUrl = (url) => {
        currentUrl = url;
    };

    return { audio, stop, setUrl };
};
