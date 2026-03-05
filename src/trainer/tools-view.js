import { syncAudioPlaybackClass, updateSliderFill } from '../utils/dom-utils.js';
/** Binds all range inputs so their visual fill stays synced with their value. */
export const bindRangeFillInputs = () => {
    document.querySelectorAll('input[type="range"]').forEach((slider) => {
        updateSliderFill(slider);
        if (slider.dataset.sliderFillBound === 'true') return;
        slider.dataset.sliderFillBound = 'true';
        slider.addEventListener('input', () => updateSliderFill(slider));
    });
};

/** Binds trainer audio cards and pauses the metronome when audio playback starts. */
export const bindTrainerAudioCards = ({ audioCards, metronomeController }) => {
    audioCards.forEach((card) => {
        const audio = card.querySelector('audio');
        if (!audio || audio.dataset.trainerAudioBound === 'true') return;

        audio.dataset.trainerAudioBound = 'true';
        const update = () => {
            syncAudioPlaybackClass({ element: card, audio });
        };

        audio.addEventListener('play', () => {
            document.querySelectorAll('.audio-card').forEach((other) => {
                if (other !== card) {
                    other.classList.remove('is-playing');
                }
            });

            if (metronomeController.isRunning()) {
                metronomeController.stop({ silent: true });
                metronomeController.setStatus('Metronome paused while audio plays.');
            }
            update();
        });

        audio.addEventListener('pause', update);
        audio.addEventListener('ended', update);
    });
};

/** Resolves the DOM elements used by the trainer metronome and drill tools. */
export const resolveTrainerToolElements = () => {
    const metronome = {
        slider: document.querySelector('[data-metronome="slider"]'),
        bpmLabel: document.querySelector('[data-metronome="bpm"]'),
        toggle: document.querySelector('[data-metronome="toggle"]'),
        tap: document.querySelector('[data-metronome="tap"]'),
        status: document.querySelector('[data-metronome="status"]'),
        dialNumber: document.querySelector('.trainer-dial .dial-number'),
        visual: document.querySelector('.trainer-metronome'),
    };

    const bowingView = document.querySelector('#view-bowing');
    const drills = {
        postureInput: document.querySelector('#posture-capture'),
        posturePreview: document.querySelector('[data-posture-preview]'),
        postureImage: document.querySelector('[data-posture-image]'),
        postureClear: document.querySelector('[data-posture-clear]'),
        postureHint: document.querySelector('.posture-hint'),
        bowingIntro: bowingView?.querySelector('.game-drill-intro') || null,
        bowingChecks: Array.from(document.querySelectorAll('#view-bowing input[id^="bow-set-"]')),
    };

    const audioCards = Array.from(document.querySelectorAll('.audio-card'));

    return {
        metronome,
        drills,
        audioCards,
    };
};
