import { setLiveNumber } from './shared.js';
import { setTextContent } from '../utils/dom-utils.js';

/** Updates the Melody Maker status message. */
export const setMelodyMakerStatus = setTextContent;

/** Renders the current Melody Maker note track preview. */
export const renderMelodyMakerTrack = (trackEl, track) => {
    if (!trackEl) return;
    trackEl.textContent = track.length ? track.join(' · ') : 'Tap notes to build a melody.';
};

/** Updates the live Melody Maker score readout. */
export const renderMelodyMakerScore = (scoreEl, score) => {
    setLiveNumber(scoreEl, 'liveScore', score);
};

/** Renders the target motif the player is trying to match. */
export const renderMelodyMakerTarget = (targetEl, targetMotif) => {
    if (!targetEl) return;
    targetEl.textContent = `Target: ${targetMotif.join(' · ')}`;
};
