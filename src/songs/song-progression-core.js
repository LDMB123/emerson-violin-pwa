import { clampRounded, DAY_MS, finiteOrNow, finiteOrZero, positiveRound } from '../utils/math.js';
import { dayCounts, DEFAULT_MASTERY_THRESHOLDS, reviewIntervalDays } from '../utils/mastery-utils.js';

const scoreFromEntry = (entry) => {
    const accuracy = finiteOrZero(entry?.bestAccuracy);
    const timing = Number.isFinite(entry?.bestTiming) ? entry.bestTiming : accuracy;
    const intonation = Number.isFinite(entry?.bestIntonation) ? entry.bestIntonation : accuracy;
    return clampRounded((accuracy + timing + intonation) / 3, 0, 100);
};

const normalizeDays = (entry) => {
    const rawDays = entry?.days && typeof entry.days === 'object'
        ? entry.days
        : null;
    const normalized = {};
    if (rawDays) {
        Object.entries(rawDays).forEach(([day, score]) => {
            if (!day) return;
            const safeScore = clampRounded(Number(score) || 0, 0, 100);
            normalized[String(day)] = safeScore;
        });
    }
    if (Object.keys(normalized).length) {
        return normalized;
    }

    const inferredScore = scoreFromEntry(entry);
    if (inferredScore <= 0) return {};
    const inferredDay = Number.isFinite(entry?.day)
        ? Math.round(entry.day)
        : Math.round(finiteOrNow(entry?.updatedAt) / DAY_MS);
    return {
        [String(inferredDay)]: inferredScore,
    };
};

export const tierFromCounts = (counts, thresholds = DEFAULT_MASTERY_THRESHOLDS) => {
    if ((counts?.goldDays || 0) >= thresholds.distinctDays) return 'gold';
    if ((counts?.silverDays || 0) >= thresholds.distinctDays) return 'silver';
    if ((counts?.bronzeDays || 0) >= thresholds.distinctDays) return 'bronze';
    return 'foundation';
};

export const normalizeSongEntry = (entry) => ({
    ...(() => {
        const updatedAt = finiteOrNow(entry?.updatedAt);
        const days = normalizeDays(entry);
        const counts = dayCounts(days);
        const tier = typeof entry?.tier === 'string' && entry.tier.trim()
            ? entry.tier.trim()
            : tierFromCounts(counts);
        const defaultNextReviewAt = updatedAt + (reviewIntervalDays(tier) * DAY_MS);
        return {
            attempts: positiveRound(entry?.attempts || 0),
            bestAccuracy: clampRounded(entry?.bestAccuracy || 0, 0, 100),
            bestTiming: clampRounded(entry?.bestTiming || 0, 0, 100),
            bestIntonation: clampRounded(entry?.bestIntonation || 0, 0, 100),
            bestStars: clampRounded(entry?.bestStars || 0, 0, 5),
            sectionProgress: entry?.sectionProgress && typeof entry.sectionProgress === 'object' ? entry.sectionProgress : {},
            checkpoint: entry?.checkpoint && typeof entry.checkpoint === 'object' ? entry.checkpoint : null,
            days,
            bronzeDays: positiveRound(entry?.bronzeDays || counts.bronzeDays || 0),
            silverDays: positiveRound(entry?.silverDays || counts.silverDays || 0),
            goldDays: positiveRound(entry?.goldDays || counts.goldDays || 0),
            tier,
            updatedAt,
            nextReviewAt: Number.isFinite(entry?.nextReviewAt) ? entry.nextReviewAt : defaultNextReviewAt,
        };
    })(),
});
