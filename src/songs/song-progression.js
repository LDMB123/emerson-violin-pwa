import { getJSON, setJSON } from '../persistence/storage.js';
import { SONG_PROGRESS_KEY } from '../persistence/storage-keys.js';
import { clamp, todayDay } from '../utils/math.js';
import { loadCurriculumState } from '../curriculum/state.js';
import {
    DAY_MS,
    dayCounts,
    normalizeSongEntry,
    reviewIntervalDays,
    tierFromCounts,
} from './song-progression-core.js';
import { collectDueSongReviewsFromState } from './song-progression-reviews.js';
import { buildUnlockMapForCatalog } from './song-progression-unlocks.js';

const DEFAULT_STATE = {
    version: 2,
    songs: {},
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeState = (stored) => {
    const base = stored && typeof stored === 'object' ? stored : DEFAULT_STATE;
    const songs = base?.songs && typeof base.songs === 'object' ? base.songs : {};
    return {
        version: 2,
        songs: Object.fromEntries(
            Object.entries(songs).map(([id, entry]) => [id, normalizeSongEntry(entry)])
        ),
    };
};

export const loadSongProgressState = async () => {
    const stored = await getJSON(SONG_PROGRESS_KEY);
    return normalizeState(stored);
};

const saveSongProgressState = async (state) => {
    const normalized = normalizeState(state);
    await setJSON(SONG_PROGRESS_KEY, normalized);
    return normalized;
};

export const updateSongProgress = async (songId, attempt = {}) => {
    if (!songId) return loadSongProgressState();

    const state = await loadSongProgressState();
    const existing = normalizeSongEntry(state.songs[songId]);

    const accuracy = Number.isFinite(attempt.accuracy) ? clamp(Math.round(attempt.accuracy), 0, 100) : 0;
    const timing = Number.isFinite(attempt.timingAccuracy)
        ? clamp(Math.round(attempt.timingAccuracy), 0, 100)
        : accuracy;
    const intonation = Number.isFinite(attempt.intonationAccuracy)
        ? clamp(Math.round(attempt.intonationAccuracy), 0, 100)
        : accuracy;
    const stars = Number.isFinite(attempt.stars)
        ? clamp(Math.round(attempt.stars), 0, 5)
        : existing.bestStars;

    const sectionProgress = {
        ...existing.sectionProgress,
    };

    if (typeof attempt.sectionId === 'string' && attempt.sectionId.trim()) {
        const key = attempt.sectionId.trim();
        const bestSection = Number.isFinite(sectionProgress[key]) ? sectionProgress[key] : 0;
        sectionProgress[key] = Math.max(bestSection, accuracy);
    }

    const dayKey = String(Number.isFinite(attempt.day) ? Math.round(attempt.day) : todayDay());
    const attemptScore = clamp(Math.round((accuracy + timing + intonation) / 3), 0, 100);
    const days = {
        ...existing.days,
        [dayKey]: Math.max(Number(existing.days?.[dayKey] || 0), attemptScore),
    };
    const counts = dayCounts(days);
    const tier = tierFromCounts(counts);
    const updatedAt = Date.now();

    const nextEntry = {
        attempts: existing.attempts + 1,
        bestAccuracy: Math.max(existing.bestAccuracy, accuracy),
        bestTiming: Math.max(existing.bestTiming, timing),
        bestIntonation: Math.max(existing.bestIntonation, intonation),
        bestStars: Math.max(existing.bestStars, stars),
        sectionProgress,
        checkpoint: existing.checkpoint,
        days,
        ...counts,
        tier,
        updatedAt,
        nextReviewAt: updatedAt + (reviewIntervalDays(tier) * DAY_MS),
    };

    const nextState = {
        ...state,
        songs: {
            ...state.songs,
            [songId]: nextEntry,
        },
    };

    await saveSongProgressState(nextState);
    return nextState;
};

export const saveSongCheckpoint = async (songId, checkpoint = {}) => {
    if (!songId) return loadSongProgressState();
    const state = await loadSongProgressState();
    const existing = normalizeSongEntry(state.songs[songId]);

    const nextState = {
        ...state,
        songs: {
            ...state.songs,
            [songId]: {
                ...existing,
                checkpoint: {
                    sectionId: checkpoint.sectionId || null,
                    elapsed: Number.isFinite(checkpoint.elapsed) ? checkpoint.elapsed : 0,
                    tempo: Number.isFinite(checkpoint.tempo) ? checkpoint.tempo : null,
                    savedAt: Date.now(),
                },
                updatedAt: Date.now(),
            },
        },
    };

    await saveSongProgressState(nextState);
    return nextState;
};

export const getSongCheckpoint = async (songId) => {
    if (!songId) return null;
    const state = await loadSongProgressState();
    return state.songs[songId]?.checkpoint || null;
};

export const collectDueSongReviews = async ({ now = Date.now(), limit = 5 } = {}) => {
    const state = await loadSongProgressState();
    return collectDueSongReviewsFromState({
        songs: state.songs,
        now,
        limit,
    });
};

export const buildSongUnlockMap = async (catalog) => {
    const [curriculumState, songProgressState] = await Promise.all([
        loadCurriculumState(),
        loadSongProgressState(),
    ]);

    const unlockMap = buildUnlockMapForCatalog(catalog, {
        curriculumState,
        songProgressState,
    });

    return {
        unlockMap,
        state: clone(songProgressState),
    };
};
