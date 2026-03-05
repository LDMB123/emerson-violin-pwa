import { updateSliderFill, setAriaPressed, updateProgressAttribute } from '../utils/dom-utils.js';

/** Creates an empty metronome element bag for uninitialized trainer views. */
export const createEmptyMetronomeElements = () => ({
    slider: null,
    bpmLabel: null,
    toggle: null,
    tap: null,
    status: null,
    dialNumber: null,
    visual: null,
});



/** Syncs metronome button and visual state to the current running flag. */
export const syncMetronomeRunningState = ({ elements, running }) => {
    if (elements.toggle) {
        elements.toggle.textContent = running ? 'Stop' : 'Start';
        setAriaPressed(elements.toggle, running);
    }
    if (elements.visual) {
        elements.visual.classList.toggle('is-running', running);
    }
};

/** Updates all metronome display elements from the current BPM value. */
export const updateMetronomeDisplay = ({ elements, bpm }) => {
    if (elements.bpmLabel) elements.bpmLabel.textContent = `${bpm} BPM`;
    if (elements.dialNumber) elements.dialNumber.textContent = String(bpm);
    if (elements.slider) {
        updateProgressAttribute(elements.slider, bpm, `${bpm} BPM`);
        elements.slider.value = String(bpm);
        updateSliderFill(elements.slider);
    }
    if (elements.visual) {
        const duration = 60 / bpm;
        elements.visual.style.setProperty('--metronome-speed', `${duration}s`);
    }
};
