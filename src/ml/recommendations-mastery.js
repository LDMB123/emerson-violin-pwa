export const DEFAULT_MASTERY_THRESHOLDS = {
    bronze: 60,
    silver: 80,
    gold: 92,
    distinctDays: 3,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_INTERVAL_DAYS_BY_TIER = {
    foundation: 1,
    bronze: 3,
    silver: 5,
    gold: 7,
};

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

const masteryScoreForEvent = (event) => (
    Number.isFinite(event.accuracy) ? event.accuracy : event.score
);

const ensureMasteryEntry = (targetMap, id) => targetMap.get(id) || {
    id,
    best: 0,
    attempts: 0,
    byDay: new Map(),
};

const updateMasteryEntry = (entry, event, score) => {
    entry.attempts += 1;
    entry.best = Math.max(entry.best, Math.round(score));
    if (Number.isFinite(event.day)) {
        const dayScore = entry.byDay.get(event.day) || 0;
        entry.byDay.set(event.day, Math.max(dayScore, Math.round(score)));
    }
};

const withMasteryTier = (entry, thresholds) => {
    const days = Array.from(entry.byDay.values());
    const bronzeDays = days.filter((score) => score >= thresholds.bronze).length;
    const silverDays = days.filter((score) => score >= thresholds.silver).length;
    const goldDays = days.filter((score) => score >= thresholds.gold).length;

    let tier = bucketLevel(entry.best, thresholds);
    if (tier !== 'none') {
        const eligibleDays = tier === 'gold' ? goldDays : tier === 'silver' ? silverDays : bronzeDays;
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
        const score = masteryScoreForEvent(event);
        if (!Number.isFinite(score)) return;

        const id = event.id;
        const targetMap = event.type === 'game' ? gamesById : songsById;
        const entry = ensureMasteryEntry(targetMap, id);
        updateMasteryEntry(entry, event, score);
        targetMap.set(id, entry);
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
        const score = Math.max(0, Math.min(100, Math.round(rawScore || 0)));
        const item = {
            id,
            label: skillLabels[id] || id,
            score,
        };
        if (score >= 92) byTier.gold.push(item);
        else if (score >= 80) byTier.silver.push(item);
        else if (score >= 60) byTier.bronze.push(item);
        else byTier.developing.push(item);
    });

    return byTier;
};

const reviewIntervalDays = (tier = 'foundation') => REVIEW_INTERVAL_DAYS_BY_TIER[tier] || 1;
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
    const entries = Object.entries(state?.games || {})
        .map(([id, entry]) => ({ id, ...(entry || {}) }))
        .filter((entry) => hasRecordedAttempts(entry.attempts))
        .map((entry) => {
            const intervalDays = reviewIntervalDays(entry.tier);
            const updatedAt = Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0;
            const dueAt = updatedAt + (intervalDays * DAY_MS);
            return {
                id: entry.id,
                dueAt,
                overdueMs: Math.max(0, now - dueAt),
                tier: entry.tier || 'foundation',
                attempts: entry.attempts || 0,
            };
        })
        .filter((entry) => entry.dueAt > 0 && entry.dueAt <= now)
        .sort((left, right) => right.overdueMs - left.overdueMs)
        .slice(0, Math.max(1, Math.round(limit)));
    return entries;
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
        href: top.type === 'song' ? `#view-song-${top.id}` : `#view-game-${top.id}`,
        rationale: `Spaced review keeps gains stable. ${totalDue} review item${totalDue === 1 ? '' : 's'} due.`,
    };
};
