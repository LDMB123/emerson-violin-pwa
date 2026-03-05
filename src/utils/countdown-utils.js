/**
 * Shared countdown polling interval in milliseconds.
 *
 * @type {number}
 */
export const COUNTDOWN_TICK_MS = 500;

/**
 * Converts remaining milliseconds to countdown seconds using upward rounding.
 *
 * @param {number} milliseconds
 * @returns {number}
 */
export const toCountdownSeconds = (milliseconds) => Math.max(0, Math.ceil(milliseconds / 1000));

/**
 * Calculates remaining countdown seconds from an absolute end time.
 *
 * @param {number} endTime
 * @param {number} [now=Date.now()]
 * @returns {number}
 */
export const toRemainingCountdownSeconds = (endTime, now = Date.now()) => toCountdownSeconds(endTime - now);
