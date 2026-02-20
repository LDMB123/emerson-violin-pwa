import { setLiveNumber } from './shared.js';

export const setMelodyMakerStatus = (statusEl, message) => {
    if (statusEl) statusEl.textContent = message;
};

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
