import { clamp } from '../utils/math.js';
import { dayCounts } from '../utils/mastery-utils.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

const SONG_MASTERY_THRESHOLDS = {
    bronze: 60,
    silver: 80,
    gold: 92,
    distinctDays: 3,
};

const REVIEW_INTERVAL_DAYS_BY_TIER = {
    foundation: 1,
    bronze: 3,
    silver: 5,
    gold: 7,
};

const scoreFromEntry = (entry) => {
    const accuracy = Number.isFinite(entry?.bestAccuracy) ? entry.bestAccuracy : 0;
    const timing = Number.isFinite(entry?.bestTiming) ? entry.bestTiming : accuracy;
    const intonation = Number.isFinite(entry?.bestIntonation) ? entry.bestIntonation : accuracy;
    return clamp(Math.round((accuracy + timing + intonation) / 3), 0, 100);
};

const normalizeDays = (entry) => {
    const rawDays = entry?.days && typeof entry.days === 'object'
        ? entry.days
        : null;
    const normalized = {};
    if (rawDays) {
        Object.entries(rawDays).forEach(([day, score]) => {
            if (!day) return;
            const safeScore = clamp(Math.round(Number(score) || 0), 0, 100);
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

export const reviewIntervalDays = (tier = 'foundation') => REVIEW_INTERVAL_DAYS_BY_TIER[tier] || 1;

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
            attempts: Math.max(0, Math.round(entry?.attempts || 0)),
            bestAccuracy: Math.max(0, Math.min(100, Math.round(entry?.bestAccuracy || 0))),
            bestTiming: Math.max(0, Math.min(100, Math.round(entry?.bestTiming || 0))),
            bestIntonation: Math.max(0, Math.min(100, Math.round(entry?.bestIntonation || 0))),
            bestStars: Math.max(0, Math.min(5, Math.round(entry?.bestStars || 0))),
            sectionProgress: entry?.sectionProgress && typeof entry.sectionProgress === 'object' ? entry.sectionProgress : {},
            checkpoint: entry?.checkpoint && typeof entry.checkpoint === 'object' ? entry.checkpoint : null,
            days,
            bronzeDays: Math.max(0, Math.round(entry?.bronzeDays || counts.bronzeDays || 0)),
            silverDays: Math.max(0, Math.round(entry?.silverDays || counts.silverDays || 0)),
            goldDays: Math.max(0, Math.round(entry?.goldDays || counts.goldDays || 0)),
            tier,
            updatedAt,
            nextReviewAt: Number.isFinite(entry?.nextReviewAt) ? entry.nextReviewAt : defaultNextReviewAt,
        };
    })(),
});
