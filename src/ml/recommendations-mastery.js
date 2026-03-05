export { DEFAULT_MASTERY_THRESHOLDS } from '../utils/mastery-utils.js';
import {
    reviewIntervalDays,
    dayCounts,
    buildDueReviewEntryFromSource,
    mapAndSelectDueReviewEntries,
    DEFAULT_MASTERY_THRESHOLDS,
} from '../utils/mastery-utils.js';
import { gameViewHash, songViewHash } from '../utils/view-hash-utils.js';
import { clampRounded, DAY_MS, finiteOrZero } from '../utils/math.js';
import { eventScore } from '../utils/event-score.js';

const bucketLevel = (score, { bronze, silver, gold }) => {
    if (score >= gold) return 'gold';
    if (score >= silver) return 'silver';
    if (score >= bronze) return 'bronze';
    return 'none';
};

const isScorableMasteryEvent = (event) => (
    Boolean(event)
    && typeof event === 'object'
    && (event.type === 'game' || event.type === 'song')
    && Boolean(event.id)
);

const supportsGetOrInsertComputed = 'getOrInsertComputed' in Map.prototype;
const newMasteryEntry = (id) => ({ id, best: 0, attempts: 0, byDay: new Map() });

const updateMasteryEntry = (entry, event, score) => {
    entry.attempts += 1;
    entry.best = Math.max(entry.best, Math.round(score));
    if (Number.isFinite(event.day)) {
        const dayScore = entry.byDay.get(event.day) ?? 0;
        entry.byDay.set(event.day, Math.max(dayScore, Math.round(score)));
    }
};

const withMasteryTier = (entry, thresholds) => {
    const { bronzeDays, silverDays, goldDays } = dayCounts(Object.fromEntries(entry.byDay), thresholds);

    let tier = bucketLevel(entry.best, thresholds);
    if (tier !== 'none') {
        let eligibleDays = bronzeDays;
        if (tier === 'gold') eligibleDays = goldDays;
        else if (tier === 'silver') eligibleDays = silverDays;
        if (eligibleDays < thresholds.distinctDays) {
            tier = 'foundation';
        }
    }

    return {
        id: entry.id,
        best: entry.best,
        attempts: entry.attempts,
        bronzeDays,
        silverDays,
        goldDays,
        tier,
    };
};

const toMasteryByIdObject = (entriesMap, thresholds) => Object.fromEntries(
    Array.from(entriesMap.values()).map((entry) => [entry.id, withMasteryTier(entry, thresholds)]),
);

export const masteryFromEvents = (events, thresholds = DEFAULT_MASTERY_THRESHOLDS) => {
    const gamesById = new Map();
    const songsById = new Map();

    events.forEach((event) => {
        if (!isScorableMasteryEvent(event)) return;
        const score = eventScore(event);
        if (!Number.isFinite(score)) return;

        const id = event.id;
        const targetMap = event.type === 'game' ? gamesById : songsById;
        const entry = supportsGetOrInsertComputed
            ? targetMap.getOrInsertComputed(id, newMasteryEntry)
            : (targetMap.get(id) ?? newMasteryEntry(id));
        updateMasteryEntry(entry, event, score);
        targetMap.set(id, entry); // no-op on getOrInsertComputed path (same ref); needed for fallback
    });

    return {
        games: toMasteryByIdObject(gamesById, thresholds),
        songs: toMasteryByIdObject(songsById, thresholds),
    };
};

export const skillMastery = (skillScores, skillLabels = {}) => {
    const entries = Object.entries(skillScores || {});
    const byTier = {
        gold: [],
        silver: [],
        bronze: [],
        developing: [],
    };

    entries.forEach(([id, rawScore]) => {
        const score = clampRounded(rawScore || 0, 0, 100);
        const item = {
            id,
            label: skillLabels[id] || id,
            score,
        };
        if (score >= DEFAULT_MASTERY_THRESHOLDS.gold) byTier.gold.push(item);
        else if (score >= DEFAULT_MASTERY_THRESHOLDS.silver) byTier.silver.push(item);
        else if (score >= DEFAULT_MASTERY_THRESHOLDS.bronze) byTier.bronze.push(item);
        else byTier.developing.push(item);
    });

    return byTier;
};

const hasRecordedAttempts = (attempts) => !Number.isFinite(attempts) || attempts > 0;

const pickTopDueReview = (dueSongs = [], dueGames = []) => {
    const topSong = dueSongs[0] || null;
    const topGame = dueGames[0] || null;
    if (!topSong && !topGame) return null;
    if (!topSong) return { type: 'game', ...topGame };
    if (!topGame) return { type: 'song', ...topSong };
    return topSong.overdueMs >= topGame.overdueMs
        ? { type: 'song', ...topSong }
        : { type: 'game', ...topGame };
};

export const collectDueGameReviews = (state, { now = Date.now(), limit = 5 } = {}) => {
    const games = Object.entries(state?.games || {})
        .map(([id, entry]) => ({ id, ...(entry || {}) }))
        .filter((entry) => hasRecordedAttempts(entry.attempts));
    return mapAndSelectDueReviewEntries({
        sourceEntries: games,
        mapEntry: (entry) => {
            const intervalDays = reviewIntervalDays(entry.tier);
            const updatedAt = finiteOrZero(entry.updatedAt);
            const dueAt = updatedAt + (intervalDays * DAY_MS);
            return buildDueReviewEntryFromSource({
                entry,
                dueAt,
                now,
            });
        },
        now,
        limit,
        requirePositiveDueAt: true,
    });
};

export const buildDueReviewAction = ({ dueSongs = [], dueGames = [], songCatalog, gameLabels = {} }) => {
    const top = pickTopDueReview(dueSongs, dueGames);
    if (!top) return null;

    const totalDue = dueSongs.length + dueGames.length;
    const songTitle = songCatalog?.byId?.[top.id]?.title || top.id;
    const gameTitle = gameLabels[top.id] || top.id;
    const label = top.type === 'song'
        ? `Review due: ${songTitle}`
        : `Review due: ${gameTitle}`;

    return {
        id: 'due-review',
        label,
        href: top.type === 'song' ? songViewHash(top.id) : gameViewHash(top.id),
        rationale: `Spaced review keeps gains stable. ${totalDue} review item${totalDue === 1 ? '' : 's'} due.`,
    };
};
