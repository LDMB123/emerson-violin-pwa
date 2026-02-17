import { clamp, deviationAccuracy } from './math.js';

export const computeBeatInterval = (bpm) => {
    return 60000 / Math.max(1, bpm);
};

export const computeBpm = (delta) => {
    if (delta <= 0) return 0;
    return clamp(Math.round(60000 / delta), 50, 160);
};

export const computeTimingScore = (delta, beatInterval) => {
    if (delta <= 0) return 0;
    const deviation = Math.abs(delta - beatInterval);
    return clamp(1 - deviation / beatInterval, 0, 1);
};

export const getRatingFromScore = (timingScore) => {
    if (timingScore >= 0.9) return { rating: 'Perfect', level: 'perfect' };
    if (timingScore >= 0.75) return { rating: 'Great', level: 'great' };
    if (timingScore >= 0.6) return { rating: 'Good', level: 'good' };
    return { rating: 'Off', level: 'off' };
};

export const computeNextCombo = (currentCombo, timingScore) => {
    if (timingScore >= 0.6) {
        return currentCombo + 1;
    }
    return 1;
};

export const computeBaseScore = (timingScore) => {
    if (timingScore >= 0.9) return 22;
    if (timingScore >= 0.75) return 16;
    if (timingScore >= 0.6) return 12;
    return 6;
};

export const computeScoreIncrement = (timingScore, combo) => {
    const base = computeBaseScore(timingScore);
    return base + combo * 2;
};

export const computeAverageFromHistory = (history) => {
    if (!history.length) return 0;
    return Math.round(history.reduce((sum, value) => sum + value, 0) / history.length);
};

export const computeAccuracyFromTimingScores = (timingScores) => {
    if (!timingScores.length) return 0;
    const avg = timingScores.reduce((sum, value) => sum + value, 0) / timingScores.length;
    return clamp(avg * 100, 0, 100);
};

export const computeAccuracyFromBpmHistory = (tapHistory, targetBpm) => {
    if (!tapHistory.length) return 0;
    const average = tapHistory.reduce((sum, value) => sum + value, 0) / tapHistory.length;
    return deviationAccuracy(average, targetBpm);
};

export const shouldBreakCombo = (delta, timingScore) => {
    return delta > 0 && timingScore < 0.6;
};

export const isMetronomeBeatStrong = (beatIndex) => {
    return beatIndex % 4 === 0;
};

export const getMetronomeNote = (beatIndex) => {
    return isMetronomeBeatStrong(beatIndex) ? 'E' : 'A';
};

export const getMetronomeVolume = (beatIndex) => {
    return isMetronomeBeatStrong(beatIndex) ? 0.18 : 0.12;
};

export const shouldMarkTapMilestone = (tapCount) => {
    return tapCount >= 8;
};

export const shouldMarkComboMilestone = (combo) => {
    return combo >= 10;
};

export const shouldMarkEnduranceMilestone = (tapCount, elapsedMs) => {
    return tapCount >= 16 || elapsedMs >= 20000;
};

export const shouldShowComboStatus = (combo) => {
    return combo >= 3;
};

export const formatComboStatus = (rating, combo) => {
    return `Nice streak! ${rating} timing · Combo x${combo}.`;
};

export const formatRegularStatus = (rating) => {
    return `Timing: ${rating}. Keep the beat steady.`;
};
