import { clampRounded, DAY_MS, positiveRound } from '../utils/math.js';
import { dayCounts, reviewIntervalDays } from '../utils/mastery-utils.js';

const SONG_MASTERY_THRESHOLDS = {
    bronze: 60,
    silver: 80,
    gold: 92,
    distinctDays: 3,
};

const scoreFromEntry = (entry) => {
    const accuracy = Number.isFinite(entry?.bestAccuracy) ? entry.bestAccuracy : 0;
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
        : Math.round((Number.isFinite(entry?.updatedAt) ? entry.updatedAt : Date.now()) / DAY_MS);
    return {
        [String(inferredDay)]: inferredScore,
    };
};

export const tierFromCounts = (counts, thresholds = SONG_MASTERY_THRESHOLDS) => {
    if ((counts?.goldDays || 0) >= thresholds.distinctDays) return 'gold';
    if ((counts?.silverDays || 0) >= thresholds.distinctDays) return 'silver';
    if ((counts?.bronzeDays || 0) >= thresholds.distinctDays) return 'bronze';
    return 'foundation';
};

export const normalizeSongEntry = (entry) => ({
    ...(() => {
        const updatedAt = Number.isFinite(entry?.updatedAt) ? entry.updatedAt : Date.now();
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
            bestStars: Math.max(0, Math.min(5, Math.round(entry?.bestStars || 0))),
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
