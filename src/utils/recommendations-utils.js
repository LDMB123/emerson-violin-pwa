import { average, clamp, DAY_MS, todayDay } from './math.js';

/**
 * Maps activity IDs to the skill area they train.
 *
 * @type {Record<string, string>}
 */
export const SKILL_BY_GAME = {
    'pitch-quest': 'pitch',
    'ear-trainer': 'pitch',
    'tuning-time': 'pitch',
    tuner: 'pitch',
    'scale-practice': 'pitch',
    'rhythm-dash': 'rhythm',
    'rhythm-painter': 'rhythm',
    pizzicato: 'rhythm',
    'duet-challenge': 'rhythm',
    'bow-hero': 'bow_control',
    'string-quest': 'bow_control',
    'stir_soup': 'bow_control',
    'windshield_wipers': 'bow_control',
    'note-memory': 'reading',
    'melody-maker': 'reading',
    'story-song': 'reading',
    'coach-focus': 'focus',
    'trainer-metronome': 'rhythm',
    'trainer-posture': 'posture',
    'bowing-coach': 'bow_control',
};

/**
 * Maps skill areas to their default recommendation target.
 *
 * @type {Record<string, string>}
 */
export const GAME_BY_SKILL = {
    pitch: 'pitch-quest',
    rhythm: 'rhythm-dash',
    bow_control: 'bow-hero',
    reading: 'note-memory',
    posture: 'view-posture',
};

/**
 * Human-readable labels for game and tool IDs.
 *
 * @type {Record<string, string>}
 */
export const GAME_LABELS = {
    'pitch-quest': 'Pitch Quest',
    'rhythm-dash': 'Rhythm Dash',
    'note-memory': 'Note Memory',
    'ear-trainer': 'Ear Trainer',
    'bow-hero': 'Bow Hero',
    'string-quest': 'String Quest',
    'rhythm-painter': 'Rhythm Painter',
    'story-song': 'Story Song Lab',
    pizzicato: 'Pizzicato Pop',
    'tuning-time': 'Tuning Time',
    'melody-maker': 'Melody Maker',
    'scale-practice': 'Scale Practice',
    'duet-challenge': 'Duet Challenge',
    'stir_soup': 'Stir the Soup',
    'windshield_wipers': 'Windshield Wipers',
    'view-posture': 'Posture Mirror',
};

/**
 * Human-readable labels for skill IDs.
 *
 * @type {Record<string, string>}
 */
export const SKILL_LABELS = {
    pitch: 'Pitch',
    rhythm: 'Rhythm',
    bow_control: 'Bowing',
    reading: 'Reading',
    posture: 'Posture',
    focus: 'Focus',
};

/**
 * Returns a decaying weight that favors recent activity.
 *
 * @param {number | null | undefined} timestamp
 * @returns {number}
 */
export const recencyWeight = (timestamp) => {
    if (!timestamp) return 1;
    const daysAgo = Math.max(0, (Date.now() - timestamp) / DAY_MS);
    return 1 / (1 + daysAgo * 0.35);
};

/**
 * Calculates a weighted average from a list of items.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number} getValue
 * @param {(item: T) => number} getWeight
 * @returns {number}
 */
export const weightedAverage = (items, getValue, getWeight) => {
    if (!items.length) return 0;
    let total = 0;
    let weightSum = 0;
    items.forEach((item) => {
        const value = getValue(item);
        const weight = getWeight(item);
        if (Number.isFinite(value) && Number.isFinite(weight)) {
            total += value * weight;
            weightSum += weight;
        }
    });
    if (!weightSum) return 0;
    return total / weightSum;
};

/**
 * Aggregates adaptive log entries into per-skill scores.
 *
 * @param {Array<{ id: string, accuracy?: number, score?: number, timestamp?: number }>} adaptiveLog
 * @returns {Record<string, number>}
 */
export const computeSkillScores = (adaptiveLog) => {
    const skillTotals = new Map();
    const skillCounts = new Map();

    adaptiveLog.forEach((entry) => {
        const skill = SKILL_BY_GAME[entry.id];
        if (!skill) return;
        const value = clamp(Number.isFinite(entry.accuracy) ? entry.accuracy : entry.score || 0, 0, 100);
        const weight = recencyWeight(entry.timestamp);
        skillTotals.set(skill, (skillTotals.get(skill) || 0) + value * weight);
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + weight);
    });

    const skillScores = {};
    skillTotals.forEach((total, skill) => {
        const count = skillCounts.get(skill) || 1;
        skillScores[skill] = clamp(total / count, 0, 100);
    });

    return skillScores;
};

/**
 * Returns the lowest-scoring tracked skill, defaulting to pitch.
 *
 * @param {Record<string, number>} skillScores
 * @returns {string}
 */
export const findWeakestSkill = (skillScores) => {
    const skillCandidates = ['pitch', 'rhythm', 'bow_control', 'reading', 'posture'];
    const weakest = skillCandidates.reduce((weakest, skill) => {
        const score = skillScores[skill] ?? 60;
        if (!weakest) return { skill, score };
        return score < weakest.score ? { skill, score } : weakest;
    }, null);
    return weakest?.skill || 'pitch';
};

/**
 * Maps recent song performance into a beginner/intermediate/advanced level.
 *
 * @param {Array<{ accuracy?: number, timestamp?: number }>} songEvents
 * @param {(timestamp?: number) => number} [recencyWeightFn=recencyWeight]
 * @returns {string}
 */
export const computeSongLevel = (songEvents, recencyWeightFn = recencyWeight) => {
    const recentSongEvents = songEvents.slice(-8);
    const averageSong = weightedAverage(
        recentSongEvents,
        (event) => clamp(event.accuracy || 0, 0, 100),
        (event) => recencyWeightFn(event.timestamp)
    ) || average(recentSongEvents.map((event) => clamp(event.accuracy || 0, 0, 100)));
    return averageSong >= 85 ? 'advanced' : averageSong >= 65 ? 'intermediate' : 'beginner';
};

/**
 * Picks a stable daily item from a list using the current day and an optional seed.
 *
 * @param {string[]} list
 * @param {number} [seed=0]
 * @returns {string}
 */
export const pickDailyCue = (list, seed = 0) => {
    if (!Array.isArray(list) || !list.length) return '';
    const day = todayDay();
    const index = Math.abs(day + seed) % list.length;
    return list[index] || list[0];
};
