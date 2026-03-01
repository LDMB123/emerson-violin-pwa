import { normalizeSongEntry } from './song-progression-core.js';
import { reviewIntervalDays } from '../utils/mastery-utils.js';
import { atLeast1, DAY_MS } from '../utils/math.js';

export const collectDueSongReviewsFromState = ({ songs = {}, now = Date.now(), limit = 5 } = {}) => {
    return Object.entries(songs || {})
        .map(([id, rawEntry]) => ({ id, ...normalizeSongEntry(rawEntry) }))
        .filter((entry) => entry.attempts > 0)
        .map((entry) => {
            const dueAt = Number.isFinite(entry.nextReviewAt)
                ? entry.nextReviewAt
                : entry.updatedAt + (reviewIntervalDays(entry.tier) * DAY_MS);
            return {
                id: entry.id,
                dueAt,
                overdueMs: Math.max(0, now - dueAt),
                tier: entry.tier,
                attempts: entry.attempts,
            };
        })
        .filter((entry) => entry.dueAt <= now)
        .sort((left, right) => right.overdueMs - left.overdueMs)
        .slice(0, atLeast1(Math.round(limit)));
};
