import { normalizeSongEntry } from './song-progression-core.js';
import {
    reviewIntervalDays,
    buildDueReviewEntry,
    selectDueReviewEntries,
} from '../utils/mastery-utils.js';
import { DAY_MS } from '../utils/math.js';

export const collectDueSongReviewsFromState = ({ songs = {}, now = Date.now(), limit = 5 } = {}) => {
    const entries = Object.entries(songs || {})
        .map(([id, rawEntry]) => ({ id, ...normalizeSongEntry(rawEntry) }))
        .filter((entry) => entry.attempts > 0)
        .map((entry) => {
            const dueAt = Number.isFinite(entry.nextReviewAt)
                ? entry.nextReviewAt
                : entry.updatedAt + (reviewIntervalDays(entry.tier) * DAY_MS);
            return buildDueReviewEntry({
                id: entry.id,
                dueAt,
                tier: entry.tier,
                attempts: entry.attempts,
                now,
            });
        })
    return selectDueReviewEntries(entries, { now, limit });
};
