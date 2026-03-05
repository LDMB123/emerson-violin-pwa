import { atLeast1, clamp } from '../../utils/math.js';
import { setTextContent } from '../../utils/dom-utils.js';
import {
    computeAverageFromHistory,
    computeBpm,
    computeTimingScore,
    shouldShowComboStatus,
    formatComboStatus,
    formatRegularStatus,
} from '../../utils/rhythm-dash-utils.js';

/** Resolves the cached DOM elements used by the Rhythm Dash view. */
/** Resolves the DOM elements used by Rhythm Dash. */
export const resolveRhythmDashElements = (stage) => ({
    tapButton: stage.querySelector('.rhythm-tap'),
    runToggle: stage.querySelector('#rhythm-run'),
    pauseButton: stage.querySelector('[data-rhythm="pause"]'),
    settingsButton: stage.querySelector('[data-rhythm="settings"]'),
    scoreEl: stage.querySelector('[data-rhythm="score"]'),
    comboEl: stage.querySelector('[data-rhythm="combo"]'),
    bpmEl: stage.querySelector('[data-rhythm="bpm"]'),
    suggestedEl: stage.querySelector('[data-rhythm="suggested"]'),
    statusEl: stage.querySelector('[data-rhythm="status"]'),
    ratingEl: stage.querySelector('[data-rhythm="rating"]'),
    meterFill: stage.querySelector('[data-rhythm="meter"]'),
    meterTrack: stage.querySelector('.rhythm-meter'),
    levelDisplay: stage.querySelector('[data-rhythm="level-display"]'),
    bpmDisplay: stage.querySelector('[data-rhythm="bpm-display"]'),
    energyBar: stage.querySelector('[data-rhythm="energy-bar"]'),
});

/** Maps a difficulty object to the coarse level label used by the UI. */
/** Maps Rhythm Dash difficulty settings to a display level. */
export const resolveDifficultyLevel = (difficulty) => (
    difficulty.complexity >= 2 ? 'hard' : difficulty.complexity >= 1 ? 'medium' : 'easy'
);

/** Writes the status message for the Rhythm Dash HUD. */
/** Updates the Rhythm Dash status text element. */
export const updateStatusText = setTextContent;

/** Syncs the score meter width and ARIA values from a normalized score value. */
/** Updates Rhythm Dash meter visuals and accessibility values. */
export const updateMeter = (meterFill, meterTrack, scoreValue) => {
    const percent = clamp(scoreValue * 100, 0, 100);
    if (meterFill) {
        meterFill.style.width = `${percent}%`;
    }
    if (meterTrack) {
        meterTrack.setAttribute('aria-valuenow', String(Math.round(percent)));
        meterTrack.setAttribute('aria-valuetext', `${Math.round(percent)}%`);
    }
};

const pushTempoHistory = ({
    history,
    value,
    maxEntries,
    suggestedEl,
    round = false,
}) => {
    const next = round ? Math.round(value) : value;
    history.push(next);
    if (history.length > maxEntries) history.shift();
    if (suggestedEl && history.length >= 2) {
        suggestedEl.textContent = String(computeAverageFromHistory(history));
    }
};

/** Updates the displayed BPM when a finite tempo estimate is available. */
/** Syncs the BPM display from numeric tempo values. */
export const syncBpmText = (bpmEl, bpmValue) => {
    if (Number.isFinite(bpmValue) && bpmValue > 0 && bpmEl) {
        bpmEl.textContent = String(Math.round(bpmValue));
    }
};

/** Formats the player-facing status message for the latest rhythm rating. */
/** Formats the Rhythm Dash status line from rating and combo state. */
export const formatRhythmStatusMessage = ({ ratingSource, rating, combo }) => (
    shouldShowComboStatus(combo)
        ? `${ratingSource}: ${formatComboStatus(rating, combo)}`
        : `${ratingSource}: ${formatRegularStatus(rating)}`
);

/** Processes a manual tap fallback input and returns the timestamp to retain. */
/** Processes tap-based Rhythm Dash timing input. */
export const handleRhythmTapInput = ({
    runToggle,
    setStatus,
    lastTap,
    beatInterval,
    tapHistory,
    suggestedEl,
    processBeat,
}) => {
    if (runToggle && !runToggle.checked) {
        setStatus('Tap Start to run the lane.');
        return lastTap;
    }
    const now = performance.now();
    const delta = lastTap ? now - lastTap : 0;
    if (delta <= 0) {
        setStatus('Tap once more to lock timing.');
        return now;
    }

    const timingScore = computeTimingScore(delta, beatInterval);
    const bpm = computeBpm(delta);
    pushTempoHistory({
        history: tapHistory,
        value: bpm,
        maxEntries: 6,
        suggestedEl,
    });
    processBeat(timingScore, { ratingSource: 'Tap fallback', bpmValue: bpm });
    return now;
};

/** Applies a realtime feature frame to Rhythm Dash and reports listening state. */
/** Applies a realtime feature frame to Rhythm Dash gameplay state. */
export const applyRealtimeRhythmFrame = ({
    detail,
    runToggle,
    setStatus,
    beatInterval,
    realtimeTempoHistory,
    suggestedEl,
    bpmEl,
    processBeat,
    targetBpm,
}) => {
    const feature = detail.lastFeature || null;
    const realtimeListening = Boolean(detail.listening) && !detail.paused;

    if (!runToggle?.checked) {
        return realtimeListening;
    }
    if (!realtimeListening) {
        setStatus('Listening is paused. Keep going with tap fallback.');
        return realtimeListening;
    }
    if (!feature || !feature.hasSignal) {
        setStatus('Listening… play a clear bow stroke.');
        return realtimeListening;
    }

    const tempo = Number.isFinite(feature.tempoBpm) && feature.tempoBpm > 0
        ? feature.tempoBpm
        : 0;
    if (tempo > 0) {
        pushTempoHistory({
            history: realtimeTempoHistory,
            value: tempo,
            maxEntries: 8,
            suggestedEl,
            round: true,
        });
        syncBpmText(bpmEl, tempo);
    }

    if (!feature.onset) {
        return realtimeListening;
    }

    const rhythmOffset = Math.abs(Number.isFinite(feature.rhythmOffsetMs) ? feature.rhythmOffsetMs : beatInterval);
    const deltaForScore = atLeast1(beatInterval - Math.min(rhythmOffset, beatInterval));
    const timingScore = computeTimingScore(deltaForScore, beatInterval);
    processBeat(timingScore, { ratingSource: 'Mic onset', bpmValue: tempo || targetBpm });
    return realtimeListening;
};
