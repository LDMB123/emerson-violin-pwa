/**
 * Clamps a number into the inclusive `[min, max]` range.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Performs a JSON-safe deep clone.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Milliseconds in one day.
 *
 * @type {number}
 */
export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns today's day number in UTC-relative day buckets.
 *
 * @returns {number}
 */
export const todayDay = () => Math.floor(Date.now() / DAY_MS);

/**
 * Converts a timestamp into a day bucket.
 *
 * @param {number} timestamp
 * @returns {number}
 */
export const dayFromTimestamp = (timestamp) => (Number.isFinite(timestamp) ? Math.floor(timestamp / DAY_MS) : 0);

/**
 * Calculates percentage accuracy from deviation relative to a target value.
 *
 * @param {number} actual
 * @param {number} target
 * @returns {number}
 */
export const deviationAccuracy = (actual, target) => clamp((1 - Math.abs(actual - target) / Math.max(target, 1)) * 100, 0, 100);
const _hasSumPrecise = 'sumPrecise' in Math;

/**
 * Sums numbers with `Math.sumPrecise` when available.
 *
 * @param {number[]} values
 * @returns {number}
 */
export const preciseSum = (values) => (_hasSumPrecise ? Math.sumPrecise(values) : values.reduce((a, b) => a + b, 0));

/**
 * Returns the average of the finite values in a list.
 *
 * @param {number[]} values
 * @param {number} [fallback=0]
 * @returns {number}
 */
export const average = (values, fallback = 0) => {
    const usable = values.filter((value) => Number.isFinite(value));
    if (!usable.length) return fallback;
    return preciseSum(usable) / usable.length;
};

/**
 * Formats a timestamp for display, or returns an em dash for invalid input.
 *
 * @param {number | string | Date | null | undefined} value
 * @returns {string}
 */
export const formatTimestamp = (value) => {
    if (!value) return '—';
    try { return new Date(value).toLocaleString(); } catch { return '—'; }
};

/**
 * Rounds a value and clamps it into the inclusive `[min, max]` range.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clampRounded = (value, min, max) => clamp(Math.round(value), min, max);

/**
 * Rounds a value and prevents negative results.
 *
 * @param {number} value
 * @returns {number}
 */
export const positiveRound = (value) => Math.max(0, Math.round(value));

/**
 * Converts seconds to minutes with a configurable rounding function.
 *
 * @param {number} seconds
 * @param {(value: number) => number} [roundFn=Math.floor]
 * @returns {number}
 */
export const durationToMinutes = (seconds, roundFn = Math.floor) => {
    const total = Math.max(0, seconds || 0);
    return roundFn(total / 60);
};

/**
 * Returns a rounded percentage from two finite numbers.
 *
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} [fallback=0]
 * @returns {number}
 */
export const percentageRounded = (numerator, denominator, fallback = 0) => {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
        return fallback;
    }
    return Math.round((numerator / denominator) * 100);
};

/**
 * Returns the number when finite, otherwise zero.
 *
 * @param {number} x
 * @returns {number}
 */
export const finiteOrZero = (x) => (Number.isFinite(x) ? x : 0);

/**
 * Returns the number when finite, otherwise the current timestamp.
 *
 * @param {number} x
 * @returns {number}
 */
export const finiteOrNow = (x) => (Number.isFinite(x) ? x : Date.now());

/**
 * Floors values at 1.
 *
 * @param {number} x
 * @returns {number}
 */
export const atLeast1 = (x) => Math.max(1, x);
