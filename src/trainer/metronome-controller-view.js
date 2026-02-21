import { updateSliderFill } from '../utils/dom-utils.js';

export const createEmptyMetronomeElements = () => ({
    slider: null,
    bpmLabel: null,
    toggle: null,
    tap: null,
    status: null,
    dialNumber: null,
    visual: null,
});



export const syncMetronomeRunningState = ({ elements, running }) => {
    if (elements.toggle) {
        elements.toggle.textContent = running ? 'Stop' : 'Start';
        elements.toggle.setAttribute('aria-pressed', running ? 'true' : 'false');
    }
    if (elements.visual) {
        elements.visual.classList.toggle('is-running', running);
    }
};

export const updateMetronomeDisplay = ({ elements, bpm }) => {
    if (elements.bpmLabel) elements.bpmLabel.textContent = `${bpm} BPM`;
    if (elements.dialNumber) elements.dialNumber.textContent = String(bpm);
    if (elements.slider) {
        elements.slider.setAttribute('aria-valuenow', String(bpm));
        elements.slider.setAttribute('aria-valuetext', `${bpm} BPM`);
        elements.slider.value = String(bpm);
        updateSliderFill(elements.slider);
    }
    if (elements.visual) {
        const duration = 60 / bpm;
        elements.visual.style.setProperty('--metronome-speed', `${duration}s`);
    }
};
