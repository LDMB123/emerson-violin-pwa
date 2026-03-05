/**
 * Utility functions for calculating mastery progress across games and songs.
 */
import { atLeast1 } from './math.js';

export const DEFAULT_MASTERY_THRESHOLDS = {
    bronze: 60,
    silver: 80,
    gold: 92,
    distinctDays: 3,
};

/**
 * Calculates the number of days a given performance score reached each mastery threshold.
 * 
 * @param {Object} days - Map of day entries to high scores for that day. 
 * @param {Object} thresholds - Object containing bronze, silver, and gold cutoffs. 
 * @returns {Object} Object containing bronzeDays, silverDays, and goldDays counts.
 */
export const dayCounts = (days, thresholds = DEFAULT_MASTERY_THRESHOLDS) => {
    const values = Object.values(days || {}).map((value) => Number(value) || 0);
    return {
        bronzeDays: values.filter((score) => score >= thresholds.bronze).length,
        silverDays: values.filter((score) => score >= thresholds.silver).length,
        goldDays: values.filter((score) => score >= thresholds.gold).length,
    };
};

export const mergeDayHighScore = (days, dayKey, score) => {
    const normalizedDays = days && typeof days === 'object' ? days : {};
    const key = String(dayKey);
    const current = Number(normalizedDays[key] || 0);
    return {
        ...normalizedDays,
        [key]: Math.max(current, Number(score) || 0),
    };
};

const REVIEW_INTERVAL_DAYS_BY_TIER = {
    foundation: 1,
    bronze: 3,
    silver: 5,
    gold: 7,
};

export const reviewIntervalDays = (tier = 'foundation') => REVIEW_INTERVAL_DAYS_BY_TIER[tier] || 1;

export const buildDueReviewEntry = ({
    id,
    dueAt,
    tier = 'foundation',
    attempts = 0,
    now = Date.now(),
}) => ({
    id,
    dueAt,
    overdueMs: Math.max(0, now - dueAt),
    tier: tier || 'foundation',
    attempts: Number(attempts) || 0,
});

export const selectDueReviewEntries = (
    entries,
    { now = Date.now(), limit = 5, requirePositiveDueAt = false } = {},
) => (entries || [])
    .filter((entry) => Number.isFinite(entry?.dueAt))
    .filter((entry) => entry.dueAt <= now)
    .filter((entry) => !requirePositiveDueAt || entry.dueAt > 0)
    .sort((left, right) => right.overdueMs - left.overdueMs)
    .slice(0, atLeast1(Math.round(limit)));
