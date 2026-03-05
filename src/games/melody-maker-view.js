import { setLiveNumber } from './shared.js';
import { setTextContent } from '../utils/dom-utils.js';

export const setMelodyMakerStatus = setTextContent;

export const renderMelodyMakerTrack = (trackEl, track) => {
    if (!trackEl) return;
    trackEl.textContent = track.length ? track.join(' · ') : 'Tap notes to build a melody.';
};

export const renderMelodyMakerScore = (scoreEl, score) => {
    setLiveNumber(scoreEl, 'liveScore', score);
};

export const renderMelodyMakerTarget = (targetEl, targetMotif) => {
    if (!targetEl) return;
    targetEl.textContent = `Target: ${targetMotif.join(' · ')}`;
};
