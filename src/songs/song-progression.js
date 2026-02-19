import { getJSON, setJSON } from '../persistence/storage.js';
import { SONG_PROGRESS_KEY } from '../persistence/storage-keys.js';
import { clamp } from '../utils/math.js';
import { loadCurriculumState } from '../curriculum/state.js';

const DEFAULT_STATE = {
    version: 2,
    songs: {},
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeSongEntry = (entry) => ({
    attempts: Math.max(0, Math.round(entry?.attempts || 0)),
    bestAccuracy: Math.max(0, Math.min(100, Math.round(entry?.bestAccuracy || 0))),
    bestTiming: Math.max(0, Math.min(100, Math.round(entry?.bestTiming || 0))),
    bestIntonation: Math.max(0, Math.min(100, Math.round(entry?.bestIntonation || 0))),
    bestStars: Math.max(0, Math.min(5, Math.round(entry?.bestStars || 0))),
    sectionProgress: entry?.sectionProgress && typeof entry.sectionProgress === 'object' ? entry.sectionProgress : {},
    checkpoint: entry?.checkpoint && typeof entry.checkpoint === 'object' ? entry.checkpoint : null,
    updatedAt: Number.isFinite(entry?.updatedAt) ? entry.updatedAt : Date.now(),
});

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

    const nextEntry = {
        attempts: existing.attempts + 1,
        bestAccuracy: Math.max(existing.bestAccuracy, accuracy),
        bestTiming: Math.max(existing.bestTiming, timing),
        bestIntonation: Math.max(existing.bestIntonation, intonation),
        bestStars: Math.max(existing.bestStars, stars),
        sectionProgress,
        checkpoint: existing.checkpoint,
        updatedAt: Date.now(),
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

const challengeReadinessCount = (state) => {
    return Object.values(state.songs).filter((entry) => (entry.bestAccuracy || 0) >= 75).length;
};

const isSongUnlocked = async (song, { curriculumState = null, songProgressState = null } = {}) => {
    if (!song || !song.id) return false;
    if (song.tier !== 'challenge') return true;

    const [state, progress] = await Promise.all([
        curriculumState ? Promise.resolve(curriculumState) : loadCurriculumState(),
        songProgressState ? Promise.resolve(songProgressState) : loadSongProgressState(),
    ]);

    const completedUnitIds = Array.isArray(state?.completedUnitIds) ? state.completedUnitIds : [];
    const prerequisites = Array.isArray(song.prerequisites) ? song.prerequisites : [];
    const prereqsMet = prerequisites.every((id) => completedUnitIds.includes(id));
    if (!prereqsMet) return false;

    return challengeReadinessCount(progress) >= 3;
};

export const buildSongUnlockMap = async (catalog) => {
    const [curriculumState, songProgressState] = await Promise.all([
        loadCurriculumState(),
        loadSongProgressState(),
    ]);

    const unlockMap = {};
    const songs = Array.isArray(catalog?.songs) ? catalog.songs : [];

    // Sequential to keep logic deterministic and simple.
    for (const song of songs) {
        unlockMap[song.id] = await isSongUnlocked(song, {
            curriculumState,
            songProgressState,
        });
    }

    return {
        unlockMap,
        state: clone(songProgressState),
    };
};
