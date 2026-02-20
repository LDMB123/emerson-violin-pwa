import { clamp } from '../../utils/math.js';
import { GAME_META } from '../game-config.js';
import {
    computeAverageFromHistory,
    computeBpm,
    computeTimingScore,
    shouldShowComboStatus,
    formatComboStatus,
    formatRegularStatus,
} from '../../utils/rhythm-dash-utils.js';

const RHYTHM_OBJECTIVE_IDS = ['rd-set-1', 'rd-set-2', 'rd-set-3'];

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
    targetSlider: stage.querySelector('[data-rhythm="target-slider"]'),
    targetValue: stage.querySelector('[data-rhythm="target-value"]'),
    settingsReset: stage.querySelector('[data-rhythm="settings-reset"]'),
});

const resolveObjectiveTier = (stage, difficulty) => stage.dataset.gameObjectiveTier
    || (difficulty.complexity >= 2 ? 'mastery' : difficulty.complexity >= 1 ? 'core' : 'foundation');

export const resolveDifficultyLevel = (difficulty) => (
    difficulty.complexity >= 2 ? 'hard' : difficulty.complexity >= 1 ? 'medium' : 'easy'
);

const countCompletedObjectives = (ids = RHYTHM_OBJECTIVE_IDS) => ids
    .map((id) => document.getElementById(id))
    .filter((input) => input instanceof HTMLInputElement && input.checked)
    .length;

export const getObjectiveSummary = (stage, difficulty) => {
    const objectiveTier = resolveObjectiveTier(stage, difficulty);
    const objectiveTotal = GAME_META?.['rhythm-dash']?.objectivePacks?.[objectiveTier]?.length || RHYTHM_OBJECTIVE_IDS.length;
    const objectivesCompleted = Math.min(objectiveTotal, countCompletedObjectives());
    return { objectiveTier, objectiveTotal, objectivesCompleted };
};

export const updateStatusText = (statusEl, message) => {
    if (statusEl) statusEl.textContent = message;
};

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

export const syncBpmText = (bpmEl, bpmValue) => {
    if (Number.isFinite(bpmValue) && bpmValue > 0 && bpmEl) {
        bpmEl.textContent = String(Math.round(bpmValue));
    }
};

export const formatRhythmStatusMessage = ({ ratingSource, rating, combo }) => (
    shouldShowComboStatus(combo)
        ? `${ratingSource}: ${formatComboStatus(rating, combo)}`
        : `${ratingSource}: ${formatRegularStatus(rating)}`
);

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
    const deltaForScore = Math.max(1, beatInterval - Math.min(rhythmOffset, beatInterval));
    const timingScore = computeTimingScore(deltaForScore, beatInterval);
    processBeat(timingScore, { ratingSource: 'Mic onset', bpmValue: tempo || targetBpm });
    return realtimeListening;
};
