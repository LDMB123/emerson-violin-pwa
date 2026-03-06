import { normalizeSongEntry } from './song-progression-core.js';
import {
    reviewIntervalDays,
    buildDueReviewEntryFromSource,
    selectDueReviewEntries,
} from '../utils/mastery-utils.js';
import { DAY_MS } from '../utils/math.js';

/**
 * Collects the next set of due song reviews from stored song progression state.
 */
export const collectDueSongReviewsFromState = ({ songs = {}, now = Date.now(), limit = 5 } = {}) => {
    const entries = Object.entries(songs || {})
        .map(([id, rawEntry]) => ({ id, ...normalizeSongEntry(rawEntry) }))
        .filter((entry) => entry.attempts > 0)
        .map((entry) => {
            const dueAt = Number.isFinite(entry.nextReviewAt)
                ? entry.nextReviewAt
                : entry.updatedAt + (reviewIntervalDays(entry.tier) * DAY_MS);
            return buildDueReviewEntryFromSource({
                dueAt,
                entry,
                now,
            });
        })
    return selectDueReviewEntries(entries, { now, limit });
};
