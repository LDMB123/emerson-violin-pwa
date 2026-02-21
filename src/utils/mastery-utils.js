/**
 * Utility functions for calculating mastery progress across games and songs.
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
