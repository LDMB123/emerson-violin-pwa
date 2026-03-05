/**
 * Utility functions for calculating mastery progress across games and songs.
 */
import { atLeast1 } from './math.js';

/**
 * Default score and repetition thresholds for mastery tiers.
 *
 * @type {{ bronze: number, silver: number, gold: number, distinctDays: number }}
 */
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

/**
 * Returns the highest mastery tier reached from distinct-day counts.
 *
 * @param {{ bronzeDays?: number, silverDays?: number, goldDays?: number }} [counts={}]
 * @param {{ distinctDays: number }} [thresholds=DEFAULT_MASTERY_THRESHOLDS]
 * @returns {string}
 */
export const tierFromDistinctDayCounts = (counts = {}, thresholds = DEFAULT_MASTERY_THRESHOLDS) => {
    if ((counts.goldDays || 0) >= thresholds.distinctDays) return 'gold';
    if ((counts.silverDays || 0) >= thresholds.distinctDays) return 'silver';
    if ((counts.bronzeDays || 0) >= thresholds.distinctDays) return 'bronze';
    return 'foundation';
};

/**
 * Merges a score into the stored per-day high-score map.
 *
 * @param {Record<string, number> | null | undefined} days
 * @param {string | number} dayKey
 * @param {number} score
 * @returns {Record<string, number>}
 */
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

/**
 * Returns the review spacing in days for a mastery tier.
 *
 * @param {string} [tier='foundation']
 * @returns {number}
 */
export const reviewIntervalDays = (tier = 'foundation') => REVIEW_INTERVAL_DAYS_BY_TIER[tier] || 1;

/**
 * Builds the normalized shape used for due-review entries.
 *
 * @param {Object} options
 * @param {string} options.id
 * @param {number} options.dueAt
 * @param {string} [options.tier='foundation']
 * @param {number} [options.attempts=0]
 * @param {number} [options.now=Date.now()]
 * @returns {{ id: string, dueAt: number, overdueMs: number, tier: string, attempts: number }}
 */
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

/**
 * Builds a due-review entry from an existing source record.
 *
 * @param {Object} [options={}]
 * @param {{ id?: string, tier?: string, attempts?: number } | null | undefined} [options.entry]
 * @param {number} [options.dueAt]
 * @param {number} [options.now=Date.now()]
 * @param {string} [options.defaultTier='foundation']
 * @returns {{ id: string, dueAt: number, overdueMs: number, tier: string, attempts: number } | null}
 */
export const buildDueReviewEntryFromSource = ({
    entry,
    dueAt,
    now = Date.now(),
    defaultTier = 'foundation',
} = {}) => {
    if (!entry?.id || !Number.isFinite(dueAt)) return null;
    return buildDueReviewEntry({
        id: entry.id,
        dueAt,
        tier: entry.tier || defaultTier,
        attempts: entry.attempts || 0,
        now,
    });
};

/**
 * Filters, sorts, and limits the entries that are currently due for review.
 *
 * @param {Array<{ dueAt?: number, overdueMs?: number }>} entries
 * @param {Object} [options={}]
 * @param {number} [options.now=Date.now()]
 * @param {number} [options.limit=5]
 * @param {boolean} [options.requirePositiveDueAt=false]
 * @returns {Array<{ dueAt?: number, overdueMs?: number }>}
 */
export const selectDueReviewEntries = (
    entries,
    { now = Date.now(), limit = 5, requirePositiveDueAt = false } = {},
) => (entries || [])
    .filter((entry) => Number.isFinite(entry?.dueAt))
    .filter((entry) => entry.dueAt <= now)
    .filter((entry) => !requirePositiveDueAt || entry.dueAt > 0)
    .sort((left, right) => right.overdueMs - left.overdueMs)
    .slice(0, atLeast1(Math.round(limit)));

/**
 * Maps source entries into due-review entries and applies standard selection.
 *
 * @template T
 * @param {Object} [options={}]
 * @param {T[]} [options.sourceEntries=[]]
 * @param {(entry: T) => any} [options.mapEntry=null]
 * @param {number} [options.now=Date.now()]
 * @param {number} [options.limit=5]
 * @param {boolean} [options.requirePositiveDueAt=false]
 * @returns {any[]}
 */
export const mapAndSelectDueReviewEntries = ({
    sourceEntries = [],
    mapEntry = null,
    now = Date.now(),
    limit = 5,
    requirePositiveDueAt = false,
} = {}) => {
    if (typeof mapEntry !== 'function') return [];
    const mapped = sourceEntries
        .map((entry) => mapEntry(entry))
        .filter(Boolean);
    return selectDueReviewEntries(mapped, {
        now,
        limit,
        requirePositiveDueAt,
    });
};
