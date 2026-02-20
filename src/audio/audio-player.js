import { SOUNDS_CHANGE } from '../utils/event-names.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { prepareAudioElementSource } from './format-detection.js';

/**
 * Progressive enhancement: replaces raw <audio controls> inside .audio-card
 * elements with custom play/pause buttons + waveform animation bars.
 *
 * Cards already shipping their own .tone-play-btn controls (e.g. tuner
 * reference tones) are intentionally skipped.
 */

const PLAY_SVG = '<svg class="tone-play-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const STOP_SVG = '<svg class="tone-stop-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
const WAVE_BARS = '<span class="wave-bars" aria-hidden="true"><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span><span class="wave-bar"></span></span>';

let globalsBound = false;

const getCardAudio = (card) => card?.querySelector('audio') || null;

const stopCardAudio = (card, { reset = true } = {}) => {
    const audio = getCardAudio(card);
    if (audio && !audio.paused) {
        audio.pause();
    }
    if (audio && reset) {
        audio.currentTime = 0;
    }
    if (card) {
        card.classList.remove('is-playing');
    }
};

const stopAllAudioCards = (exceptCard = null) => {
    document.querySelectorAll('.audio-card').forEach((card) => {
        if (exceptCard && card === exceptCard) return;
        stopCardAudio(card);
    });
};

const syncCardSoundState = (card, enabled = isSoundEnabled()) => {
    if (!card || card.dataset.audioPlayerEnhanced !== 'true') return;
    const button = card.querySelector('.tone-play-btn');
    if (button) button.disabled = !enabled;
    if (!enabled) stopCardAudio(card);
};

const syncEnhancedSoundState = (enabled = isSoundEnabled()) => {
    document.querySelectorAll('.audio-card[data-audio-player-enhanced="true"]').forEach((card) => {
        syncCardSoundState(card, enabled);
    });
};

const enhance = (card) => {
    if (!card) return;

    if (card.dataset.audioPlayerEnhanced === 'true') {
        syncCardSoundState(card);
        return;
    }

    // Skip cards already using custom controls from their own module.
    if (card.querySelector('.tone-play-btn')) return;

    const audio = card.querySelector('audio[controls]');
    if (!audio) return;
    prepareAudioElementSource(audio);

    const label = card.querySelector('.audio-label');
    const labelText = label?.textContent?.trim() ?? '';
    const stringMatch = labelText.match(/^([GDAE])\d?$/i);
    if (stringMatch) {
        card.dataset.string = stringMatch[1].toUpperCase();
    }

    audio.removeAttribute('controls');
    audio.hidden = true;

    const ariaLabel = label ? `Play ${labelText}` : 'Play';

    const button = document.createElement('button');
    button.className = 'tone-play-btn';
    button.type = 'button';
    button.setAttribute('aria-label', ariaLabel);
    button.innerHTML = PLAY_SVG + STOP_SVG;

    const waveContainer = document.createElement('span');
    waveContainer.innerHTML = WAVE_BARS;
    const waveBars = waveContainer.firstElementChild;

    card.insertBefore(button, audio);
    card.insertBefore(waveBars, audio);

    const syncPlayingState = () => {
        card.classList.toggle('is-playing', !audio.paused);
    };

    button.addEventListener('click', () => {
        if (!isSoundEnabled()) {
            syncCardSoundState(card, false);
            return;
        }

        if (!audio.paused) {
            stopCardAudio(card);
            return;
        }

        stopAllAudioCards(card);
        audio.currentTime = 0;
        audio.play().catch(() => {});
    });

    audio.addEventListener('play', () => {
        stopAllAudioCards(card);
        syncPlayingState();
    });
    audio.addEventListener('pause', syncPlayingState);
    audio.addEventListener('ended', syncPlayingState);

    card.dataset.audioPlayerEnhanced = 'true';
    syncCardSoundState(card);
};

const enhanceAll = () => {
    document.querySelectorAll('.audio-card').forEach(enhance);
};

const bindGlobals = () => {
    if (globalsBound) return;
    globalsBound = true;

    document.addEventListener(SOUNDS_CHANGE, (event) => {
        const enabled = event.detail?.enabled !== false;
        if (!enabled) {
            stopAllAudioCards();
        }
        syncEnhancedSoundState(enabled);
    });

    document.addEventListener('panda:view-rendered', () => {
        enhanceAll();
    });

    window.addEventListener('hashchange', () => {
        requestAnimationFrame(() => {
            requestAnimationFrame(enhanceAll);
        });
    });
};

const initAudioPlayer = () => {
    enhanceAll();
    bindGlobals();
    syncEnhancedSoundState();
};

initAudioPlayer();
