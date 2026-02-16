import { clamp } from '../utils/math.js';

/**
 * Determines if the given view ID represents a practice view.
 * Practice views include games, songs, and trainer/coach views.
 * @param {string} viewId - The view identifier (e.g., 'view-home', 'view-game-scales')
 * @returns {boolean} True if the view is a practice view
 */
export const isPracticeView = (viewId) => {
    if (viewId.startsWith('view-game-')) return true;
    if (viewId.startsWith('view-song-')) return true;
    return ['view-coach', 'view-games', 'view-songs', 'view-trainer', 'view-tuner', 'view-bowing', 'view-posture'].includes(viewId);
};

/**
 * Calculates BPM from an array of tap intervals.
 * @param {number[]} intervals - Array of time intervals in milliseconds
 * @returns {number} Calculated BPM rounded to nearest integer
 */
export const calculateMetronomeBpm = (intervals) => {
    const avg = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    return Math.round(60000 / avg);
};

/**
 * Calculates the interval in milliseconds for a given BPM.
 * @param {number} bpm - Beats per minute
 * @returns {number} Interval in milliseconds, rounded to nearest integer
 */
export const calculateMetronomeInterval = (bpm) => {
    return Math.round(60000 / bpm);
};

/**
 * Clamps BPM value within valid range (50-140).
 * @param {number} bpm - The BPM value to clamp
 * @returns {number} Clamped BPM value
 */
export const clampBpm = (bpm) => {
    return clamp(bpm, 50, 140);
};

/**
 * Calculates metronome accuracy percentage based on current and target BPM.
 * @param {number} currentBpm - The current BPM setting
 * @param {number} targetBpm - The target BPM to match
 * @returns {number} Accuracy percentage (0-100)
 */
export const calculateMetronomeAccuracy = (currentBpm, targetBpm) => {
    const delta = Math.abs(currentBpm - targetBpm) / Math.max(targetBpm, 1);
    return clamp((1 - delta) * 100, 0, 100);
};

/**
 * Calculates posture accuracy percentage based on count and target.
 * @param {number} count - Number of posture snapshots taken
 * @param {number} target - Target number of snapshots
 * @returns {number} Accuracy percentage (0-100)
 */
export const calculatePostureAccuracy = (count, target) => {
    return clamp((count / target) * 100, 0, 100);
};

/**
 * Calculates posture score based on snapshot count.
 * @param {number} count - Number of posture snapshots
 * @returns {number} Score value
 */
export const calculatePostureScore = (count) => {
    return count * 20;
};

/**
 * Calculates bowing accuracy percentage based on completed and target sets.
 * @param {number} completed - Number of completed bowing sets
 * @param {number} target - Target number of sets
 * @returns {number} Accuracy percentage (0-100)
 */
export const calculateBowingAccuracy = (completed, target) => {
    return clamp((completed / target) * 100, 0, 100);
};

/**
 * Calculates bowing score based on completed sets.
 * @param {number} completed - Number of completed bowing sets
 * @returns {number} Score value
 */
export const calculateBowingScore = (completed) => {
    return completed * 25;
};

/**
 * Formats the posture hint text based on current count and target.
 * @param {number} count - Current snapshot count
 * @param {number} target - Target snapshot count
 * @returns {string} Formatted hint message
 */
export const formatPostureHint = (count, target) => {
    const remaining = Math.max(0, target - count);

    if (count === 0) {
        return `Suggested: ${target} snapshot${target === 1 ? '' : 's'} this week. Photos stay on your device.`;
    }

    if (remaining > 0) {
        return `Nice! ${remaining} more snapshot${remaining === 1 ? '' : 's'} to reach your goal.`;
    }

    return 'Posture goal met. Great alignment today!';
};

/**
 * Formats the bowing intro text with the target goal.
 * @param {string} baseText - The base intro text
 * @param {number} target - Target number of sets
 * @returns {string} Formatted intro text with goal
 */
export const formatBowingIntroText = (baseText, target) => {
    return `${baseText} Goal: ${target} sets.`;
};

/**
 * Determines if tap times should be cleared based on time gap.
 * @param {number} lastTapTime - The timestamp of the last tap
 * @param {number} currentTime - The current timestamp
 * @param {number} threshold - Maximum allowed gap in milliseconds (default: 2000)
 * @returns {boolean} True if tap times should be cleared
 */
export const shouldClearTapTimes = (lastTapTime, currentTime, threshold = 2000) => {
    return (currentTime - lastTapTime) > threshold;
};
