import { isSoundEnabled, isSoundDisabledEvent } from '../utils/sound-state.js';
import { SOUNDS_CHANGE, emitEvent } from '../utils/event-names.js';
import { bindHiddenAndPagehide } from '../utils/lifecycle-utils.js';
import { mergeControllerElements } from './controller-elements.js';

const createEmptyElements = () => ({
    soundToggle: null,
});

export const createMediaSoundController = () => {
    let elements = createEmptyElements();
    let audioFocusGlobalsBound = false;

    const getAudioElements = () => Array.from(document.querySelectorAll('audio'));

    const pauseAudioElement = (audio, { reset = true } = {}) => {
        if (!audio) return;
        if (!audio.paused) {
            audio.pause();
        }
        if (reset) {
            audio.currentTime = 0;
        }
    };

    const pauseOtherAudio = (current) => {
        getAudioElements().forEach((audio) => {
            if (audio !== current) {
                pauseAudioElement(audio, { reset: true });
            }
        });
    };

    const pauseAllAudio = () => {
        pauseOtherAudio(null);
    };

    const buildAudioLabel = (audio) => {
        if (!audio) return 'Practice Audio';
        const labelledBy = audio.getAttribute('aria-labelledby');
        if (labelledBy) {
            const labelEl = document.getElementById(labelledBy);
            if (labelEl?.textContent) return labelEl.textContent.trim();
        }
        const tone = audio.dataset.toneAudio;
        if (tone) return `Reference tone ${tone}`;
        const panelTitle = audio.closest('.audio-panel')?.querySelector('h3')?.textContent?.trim();
        if (panelTitle) return panelTitle;
        return 'Practice Audio';
    };

    const bindMediaSession = () => {
        const audios = getAudioElements();
        if (!audios.length) return;
        let currentAudio = null;

        const updateState = (state) => {
            try {
                navigator.mediaSession.playbackState = state;
            } catch {
                // Ignore unsupported playback state errors
            }
        };

        const applyMetadata = (audio) => {
            const label = buildAudioLabel(audio);
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: label,
                    artist: 'Panda Violin',
                    album: 'Practice Tools',
                });
            } catch {
                // Ignore metadata failures
            }
        };

        audios.forEach((audio) => {
            audio.addEventListener('play', () => {
                currentAudio = audio;
                applyMetadata(audio);
                updateState('playing');
            });
            audio.addEventListener('pause', () => {
                if (currentAudio === audio) updateState('paused');
            });
            audio.addEventListener('ended', () => {
                if (currentAudio === audio) updateState('none');
            });
        });

        try {
            navigator.mediaSession.setActionHandler('play', async () => {
                if (!isSoundEnabled()) return;
                if (currentAudio) {
                    await currentAudio.play().catch(() => {});
                }
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                if (currentAudio) currentAudio.pause();
            });
            navigator.mediaSession.setActionHandler('stop', () => {
                if (currentAudio) currentAudio.pause();
                updateState('none');
            });
        } catch {
            // Some action handlers may not be supported on this device
        }
    };

    const bindAudioFocus = () => {
        getAudioElements().forEach((audio) => {
            if (audio.dataset.audioFocusBound === 'true') return;
            audio.dataset.audioFocusBound = 'true';
            audio.addEventListener('play', () => {
                if (!isSoundEnabled()) {
                    pauseAudioElement(audio, { reset: true });
                    return;
                }
                pauseOtherAudio(audio);
            });
        });

        if (audioFocusGlobalsBound) return;
        audioFocusGlobalsBound = true;

        document.addEventListener(SOUNDS_CHANGE, (event) => {
            if (isSoundDisabledEvent(event)) {
                pauseAllAudio();
            }
        });

        bindHiddenAndPagehide({
            onHidden: pauseAllAudio,
        });
        window.addEventListener('hashchange', () => {
            pauseAllAudio();
        }, { passive: true });
    };

    const resolveSoundState = () => (elements.soundToggle ? elements.soundToggle.checked : isSoundEnabled());

    const updateSoundState = () => {
        const enabled = resolveSoundState();
        document.documentElement.dataset.sounds = enabled ? 'on' : 'off';
        getAudioElements().forEach((audio) => {
            audio.muted = !enabled;
            if (!enabled && !audio.paused) {
                pauseAudioElement(audio, { reset: true });
            }
        });
        emitEvent(SOUNDS_CHANGE, { enabled });
    };

    const bindSoundToggle = () => {
        if (elements.soundToggle) {
            elements.soundToggle.checked = isSoundEnabled();
            if (elements.soundToggle.dataset.nativeBound !== 'true') {
                elements.soundToggle.dataset.nativeBound = 'true';
                elements.soundToggle.addEventListener('change', updateSoundState);
            }
        }
        updateSoundState();
    };

    return {
        setElements(nextElements) {
            elements = mergeControllerElements(createEmptyElements, nextElements);
        },
        bindMediaSession,
        bindAudioFocus,
        bindSoundToggle,
        updateSoundState,
    };
};
