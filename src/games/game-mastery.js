import { getJSON, setJSON } from '../persistence/storage.js';
import { GAME_MASTERY_KEY } from '../persistence/storage-keys.js';
import { clampRounded, clone, finiteOrNow, finiteOrZero, positiveRound } from '../utils/math.js';
import {
    DEFAULT_MASTERY_THRESHOLDS,
    dayCounts,
    mergeDayHighScore,
    tierFromDistinctDayCounts,
} from '../utils/mastery-utils.js';

const normalizeGameEntry = (entry) => ({
    id: entry?.id || '',
    best: clampRounded(entry?.best || 0, 0, 100),
    attempts: positiveRound(entry?.attempts || 0),
    days: entry?.days && typeof entry.days === 'object' ? entry.days : {},
    bronzeDays: positiveRound(entry?.bronzeDays || 0),
    silverDays: positiveRound(entry?.silverDays || 0),
    goldDays: positiveRound(entry?.goldDays || 0),
    tier: entry?.tier || 'foundation',
    updatedAt: finiteOrNow(entry?.updatedAt),
});

const asObject = (value) => (
    value && typeof value === 'object' ? value : {}
);

const normalizeState = (stored) => {
    const base = asObject(stored);
    const games = asObject(base.games);

    return {
        version: 1,
        games: Object.fromEntries(
            Object.entries(games).map(([id, entry]) => [id, normalizeGameEntry({ ...entry, id })])
        ),
    };
};

const tierFromDays = (entry, thresholds = DEFAULT_MASTERY_THRESHOLDS) => {
    return tierFromDistinctDayCounts(entry, thresholds);
};

export const getTierDays = (entry, tier) => {
    if (!entry) return 0;
    if (tier === 'gold' || tier === 'mastery') return entry.goldDays || 0;
    if (tier === 'silver' || tier === 'core') return entry.silverDays || 0;
    return entry.bronzeDays || 0;
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
    const normalizedScore = clampRounded(score, 0, 100);
    const dayKey = String(finiteOrZero(day));

    const days = mergeDayHighScore(existing.days, dayKey, normalizedScore);

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
