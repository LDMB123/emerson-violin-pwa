import { getJSON, setJSON } from '../persistence/storage.js';
import { SONG_PROGRESS_KEY } from '../persistence/storage-keys.js';
import { clampRounded, clone, DAY_MS, finiteOrZero, todayDay } from '../utils/math.js';
import { loadCurriculumState } from '../curriculum/state.js';
import {
    normalizeSongEntry,
    tierFromCounts,
} from './song-progression-core.js';
import { dayCounts, mergeDayHighScore, reviewIntervalDays } from '../utils/mastery-utils.js';
import { collectDueSongReviewsFromState } from './song-progression-reviews.js';
import { buildUnlockMapForCatalog } from './song-progression-unlocks.js';

const DEFAULT_STATE = {
    version: 2,
    songs: {},
};

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

const loadSongEntryContext = async (songId) => {
    const state = await loadSongProgressState();
    return {
        state,
        existing: normalizeSongEntry(state.songs[songId]),
    };
};

const withUpdatedSongEntry = async (songId, buildEntry) => {
    if (!songId) return loadSongProgressState();
    const { state, existing } = await loadSongEntryContext(songId);
    const nextState = {
        ...state,
        songs: {
            ...state.songs,
            [songId]: buildEntry(existing, state),
        },
    };
    await saveSongProgressState(nextState);
    return nextState;
};

export const updateSongProgress = async (songId, attempt = {}) => {
    return withUpdatedSongEntry(songId, (existing) => {
        const accuracy = Number.isFinite(attempt.accuracy) ? clampRounded(attempt.accuracy, 0, 100) : 0;
        const timing = Number.isFinite(attempt.timingAccuracy)
            ? clampRounded(attempt.timingAccuracy, 0, 100)
            : accuracy;
        const intonation = Number.isFinite(attempt.intonationAccuracy)
            ? clampRounded(attempt.intonationAccuracy, 0, 100)
            : accuracy;
        const stars = Number.isFinite(attempt.stars)
            ? clampRounded(attempt.stars, 0, 5)
            : existing.bestStars;

        const sectionProgress = {
            ...existing.sectionProgress,
        };

        if (typeof attempt.sectionId === 'string' && attempt.sectionId.trim()) {
            const key = attempt.sectionId.trim();
            const bestSection = finiteOrZero(sectionProgress[key]);
            sectionProgress[key] = Math.max(bestSection, accuracy);
        }

        const dayKey = String(Number.isFinite(attempt.day) ? Math.round(attempt.day) : todayDay());
        const attemptScore = clampRounded((accuracy + timing + intonation) / 3, 0, 100);
        const days = mergeDayHighScore(existing.days, dayKey, attemptScore);
        const counts = dayCounts(days);
        const tier = tierFromCounts(counts);
        const updatedAt = Date.now();

        return {
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
    });
};

export const saveSongCheckpoint = async (songId, checkpoint = {}) => {
    return withUpdatedSongEntry(songId, (existing) => {
        const updatedAt = Date.now();
        return {
            ...existing,
            checkpoint: {
                sectionId: checkpoint.sectionId || null,
                elapsed: finiteOrZero(checkpoint.elapsed),
                tempo: Number.isFinite(checkpoint.tempo) ? checkpoint.tempo : null,
                savedAt: updatedAt,
            },
            updatedAt,
        };
    });
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
