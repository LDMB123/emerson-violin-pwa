import { getJSON, setJSON } from '../persistence/storage.js';
import { GAME_MASTERY_KEY } from '../persistence/storage-keys.js';
import { DEFAULT_MASTERY_THRESHOLDS, dayCounts } from '../utils/mastery-utils.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeGameEntry = (entry) => ({
    id: entry?.id || '',
    best: Math.max(0, Math.min(100, Math.round(entry?.best || 0))),
    attempts: Math.max(0, Math.round(entry?.attempts || 0)),
    days: entry?.days && typeof entry.days === 'object' ? entry.days : {},
    bronzeDays: Math.max(0, Math.round(entry?.bronzeDays || 0)),
    silverDays: Math.max(0, Math.round(entry?.silverDays || 0)),
    goldDays: Math.max(0, Math.round(entry?.goldDays || 0)),
    tier: entry?.tier || 'foundation',
    updatedAt: Number.isFinite(entry?.updatedAt) ? entry.updatedAt : Date.now(),
});

const normalizeState = (stored) => {
    const base = stored && typeof stored === 'object' ? stored : {};
    const games = base.games && typeof base.games === 'object' ? base.games : {};

    return {
        version: 1,
        games: Object.fromEntries(
            Object.entries(games).map(([id, entry]) => [id, normalizeGameEntry({ ...entry, id })])
        ),
    };
};

const tierFromDays = (entry, thresholds = DEFAULT_MASTERY_THRESHOLDS) => {
    if ((entry.goldDays || 0) >= thresholds.distinctDays) return 'gold';
    if ((entry.silverDays || 0) >= thresholds.distinctDays) return 'silver';
    if ((entry.bronzeDays || 0) >= thresholds.distinctDays) return 'bronze';
    return 'foundation';
};

export const loadGameMasteryState = async () => {
    const stored = await getJSON(GAME_MASTERY_KEY);
    return normalizeState(stored);
};

const saveGameMasteryState = async (state) => {
    const normalized = normalizeState(state);
    await setJSON(GAME_MASTERY_KEY, normalized);
    return normalized;
};

export const updateGameMastery = async ({
    gameId,
    score,
    day,
    thresholds = DEFAULT_MASTERY_THRESHOLDS,
} = {}) => {
    if (!gameId || !Number.isFinite(score)) {
        return loadGameMasteryState();
    }

    const state = await loadGameMasteryState();
    const existing = normalizeGameEntry({ ...state.games[gameId], id: gameId });
    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
    const dayKey = String(Number.isFinite(day) ? day : 0);

    const days = {
        ...existing.days,
        [dayKey]: Math.max(Number(existing.days?.[dayKey] || 0), normalizedScore),
    };

    const counts = dayCounts(days, thresholds);
    const nextEntry = {
        ...existing,
        best: Math.max(existing.best, normalizedScore),
        attempts: existing.attempts + 1,
        days,
        ...counts,
        updatedAt: Date.now(),
    };
    nextEntry.tier = tierFromDays(nextEntry, thresholds);

    const nextState = {
        ...state,
        games: {
            ...state.games,
            [gameId]: nextEntry,
        },
    };

    await saveGameMasteryState(nextState);
    return {
        state: nextState,
        game: clone(nextEntry),
    };
};

export const summarizeGameMastery = (state) => {
    const normalized = normalizeState(state);
    const games = Object.values(normalized.games);
    const summary = {
        bronze: 0,
        silver: 0,
        gold: 0,
        foundation: 0,
    };

    games.forEach((game) => {
        if (game.tier === 'gold') summary.gold += 1;
        else if (game.tier === 'silver') summary.silver += 1;
        else if (game.tier === 'bronze') summary.bronze += 1;
        else summary.foundation += 1;
    });

    return summary;
};
