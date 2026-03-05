import { atLeast1, clamp, clampRounded, deviationAccuracy, preciseSum } from './math.js';

/**
 * Converts BPM to the interval between beats in milliseconds.
 *
 * @param {number} bpm
 * @returns {number}
 */
export const computeBeatInterval = (bpm) => {
    return 60000 / atLeast1(bpm);
};

/**
 * Converts the time between taps into a clamped BPM value.
 *
 * @param {number} delta
 * @returns {number}
 */
export const computeBpm = (delta) => {
    if (delta <= 0) return 0;
    return clampRounded(60000 / delta, 50, 160);
};

/**
 * Scores a tap against the target beat interval on a 0-1 scale.
 *
 * @param {number} delta
 * @param {number} beatInterval
 * @returns {number}
 */
export const computeTimingScore = (delta, beatInterval) => {
    if (delta <= 0) return 0;
    const deviation = Math.abs(delta - beatInterval);
    return clamp(1 - deviation / beatInterval, 0, 1);
};

/**
 * Maps a timing score to the feedback label used by the game UI.
 *
 * @param {number} timingScore
 * @returns {{ rating: string, level: string }}
 */
export const getRatingFromScore = (timingScore) => {
    if (timingScore >= 0.9) return { rating: 'Perfect', level: 'perfect' };
    if (timingScore >= 0.75) return { rating: 'Great', level: 'great' };
    if (timingScore >= 0.6) return { rating: 'Good', level: 'good' };
    return { rating: 'Off', level: 'off' };
};

/**
 * Advances or resets the combo counter after a tap.
 *
 * @param {number} currentCombo
 * @param {number} timingScore
 * @returns {number}
 */
export const computeNextCombo = (currentCombo, timingScore) => {
    if (timingScore >= 0.6) {
        return currentCombo + 1;
    }
    return 1;
};

/**
 * Returns the base score awarded for a tap before combo bonuses.
 *
 * @param {number} timingScore
 * @returns {number}
 */
export const computeBaseScore = (timingScore) => {
    if (timingScore >= 0.9) return 22;
    if (timingScore >= 0.75) return 16;
    if (timingScore >= 0.6) return 12;
    return 6;
};

/**
 * Combines base tap score and combo bonus for one hit.
 *
 * @param {number} timingScore
 * @param {number} combo
 * @returns {number}
 */
export const computeScoreIncrement = (timingScore, combo) => {
    const base = computeBaseScore(timingScore);
    return base + combo * 2;
};

/**
 * Returns the rounded average of a numeric history list.
 *
 * @param {number[]} history
 * @returns {number}
 */
export const computeAverageFromHistory = (history) => {
    if (!history.length) return 0;
    return Math.round(preciseSum(history) / history.length);
};

/**
 * Converts timing scores on a 0-1 scale into an accuracy percentage.
 *
 * @param {number[]} timingScores
 * @returns {number}
 */
export const computeAccuracyFromTimingScores = (timingScores) => {
    if (!timingScores.length) return 0;
    const avg = preciseSum(timingScores) / timingScores.length;
    return clamp(avg * 100, 0, 100);
};

/**
 * Estimates accuracy by comparing average tapped BPM against the target BPM.
 *
 * @param {number[]} tapHistory
 * @param {number} targetBpm
 * @returns {number}
 */
export const computeAccuracyFromBpmHistory = (tapHistory, targetBpm) => {
    if (!tapHistory.length) return 0;
    const average = preciseSum(tapHistory) / tapHistory.length;
    return deviationAccuracy(average, targetBpm);
};

const isMetronomeBeatStrong = (beatIndex) => {
    return beatIndex % 4 === 0;
};

/**
 * Returns the metronome pitch for the given beat index.
 *
 * @param {number} beatIndex
 * @returns {string}
 */
export const getMetronomeNote = (beatIndex) => {
    return isMetronomeBeatStrong(beatIndex) ? 'E' : 'A';
};

/**
 * Returns the metronome volume for the given beat index.
 *
 * @param {number} beatIndex
 * @returns {number}
 */
export const getMetronomeVolume = (beatIndex) => {
    return isMetronomeBeatStrong(beatIndex) ? 0.18 : 0.12;
};

/**
 * Checks whether a tap-count milestone should be announced.
 *
 * @param {number} tapCount
 * @returns {boolean}
 */
export const shouldMarkTapMilestone = (tapCount) => {
    return tapCount >= 8;
};

/**
 * Checks whether a combo milestone should be announced.
 *
 * @param {number} combo
 * @returns {boolean}
 */
export const shouldMarkComboMilestone = (combo) => {
    return combo >= 10;
};

/**
 * Checks whether the endurance milestone has been reached.
 *
 * @param {number} tapCount
 * @param {number} elapsedMs
 * @returns {boolean}
 */
export const shouldMarkEnduranceMilestone = (tapCount, elapsedMs) => {
    return tapCount >= 16 || elapsedMs >= 20000;
};

/**
 * Checks whether combo-focused status text should be shown.
 *
 * @param {number} combo
 * @returns {boolean}
 */
export const shouldShowComboStatus = (combo) => {
    return combo >= 3;
};

/**
 * Formats the status message used for combo streaks.
 *
 * @param {string} rating
 * @param {number} combo
 * @returns {string}
 */
export const formatComboStatus = (rating, combo) => {
    return `Nice streak! ${rating} timing · Combo x${combo}.`;
};

/**
 * Formats the standard non-combo status message.
 *
 * @param {string} rating
 * @returns {string}
 */
export const formatRegularStatus = (rating) => {
    return `Timing: ${rating}. Keep the beat steady.`;
};
