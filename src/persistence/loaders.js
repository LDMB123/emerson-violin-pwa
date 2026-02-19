import { getJSON, setJSON, getBlob } from './storage.js';
import { EVENTS_KEY, RECORDINGS_KEY } from './storage-keys.js';

const dayFromTimestamp = (timestamp) => {
    if (!Number.isFinite(timestamp)) return 0;
    return Math.floor(timestamp / 86400000);
};

const clampScore = (value, max = 100) => {
    const score = Number(value);
    if (!Number.isFinite(score)) return null;
    return Math.max(0, Math.min(max, Math.round(score)));
};

const normalizeSongStars = (event, accuracy) => {
    if (Number.isFinite(event?.stars)) {
        return Math.max(0, Math.min(5, Math.round(event.stars)));
    }
    if (!Number.isFinite(accuracy)) return null;
    if (accuracy >= 95) return 5;
    if (accuracy >= 88) return 4;
    if (accuracy >= 78) return 3;
    if (accuracy >= 66) return 2;
    if (accuracy >= 50) return 1;
    return 0;
};

const normalizeEvent = (event) => {
    if (!event || typeof event !== 'object') return null;
    const timestamp = Number.isFinite(event.timestamp) ? event.timestamp : Date.now();
    const normalized = {
        ...event,
        timestamp,
        day: Number.isFinite(event.day) ? event.day : dayFromTimestamp(timestamp),
    };

    if (event.type === 'game') {
        const score = clampScore(event.score);
        const accuracy = clampScore(event.accuracy ?? event.score);
        normalized.score = score ?? 0;
        normalized.accuracy = accuracy ?? 0;
        if (!normalized.difficulty && typeof event.mode === 'string') {
            normalized.difficulty = event.mode;
        }
        if (!normalized.tier && typeof event.level === 'string') {
            normalized.tier = event.level;
        }
        if (!Number.isFinite(normalized.objectiveTotal) && Number.isFinite(event?.objectives?.total)) {
            normalized.objectiveTotal = Math.max(0, Math.round(event.objectives.total));
        }
        if (!Number.isFinite(normalized.objectivesCompleted) && Number.isFinite(event?.objectives?.completed)) {
            normalized.objectivesCompleted = Math.max(0, Math.round(event.objectives.completed));
        }
        if (!Number.isFinite(normalized.mistakes) && Number.isFinite(event?.misses)) {
            normalized.mistakes = Math.max(0, Math.round(event.misses));
        }
    }

    if (event.type === 'song') {
        const accuracy = clampScore(event.accuracy ?? event.score);
        const timingAccuracy = clampScore(event.timingAccuracy ?? accuracy);
        const intonationAccuracy = clampScore(event.intonationAccuracy ?? accuracy);
        normalized.accuracy = accuracy ?? 0;
        normalized.timingAccuracy = timingAccuracy ?? 0;
        normalized.intonationAccuracy = intonationAccuracy ?? 0;
        normalized.stars = normalizeSongStars(event, accuracy);
        if (!normalized.attemptType) {
            normalized.attemptType = normalized.sectionId ? 'section' : 'full';
        }
        if (!Number.isFinite(normalized.tempo) && Number.isFinite(event.bpm)) {
            normalized.tempo = Math.max(30, Math.round(event.bpm));
        }
    }

    if (event.type === 'practice') {
        normalized.minutes = Number.isFinite(event.minutes) ? Math.max(0, event.minutes) : 0;
    }

    return normalized;
};

export const migrateEventShape = (events) => {
    if (!Array.isArray(events)) {
        return { events: [], changed: true };
    }

    let changed = false;
    const next = events
        .map((event) => {
            const normalized = normalizeEvent(event);
            if (!normalized) {
                changed = true;
                return null;
            }
            if (JSON.stringify(normalized) !== JSON.stringify(event)) {
                changed = true;
            }
            return normalized;
        })
        .filter(Boolean);

    return { events: next, changed };
};

export const loadEvents = async () => {
    const stored = await getJSON(EVENTS_KEY);
    const migrated = migrateEventShape(stored);
    if (migrated.changed) {
        await setJSON(EVENTS_KEY, migrated.events);
    }
    return migrated.events;
};

export const saveEvents = async (events) => {
    await setJSON(EVENTS_KEY, events);
};

export const loadRecordings = async () => {
    const stored = await getJSON(RECORDINGS_KEY);
    if (!Array.isArray(stored)) return [];
    return stored
        .map((recording) => {
            if (!recording || typeof recording !== 'object') return null;
            return {
                ...recording,
                id: recording.id || `recording-${recording.timestamp || Date.now()}`,
                timestamp: Number.isFinite(recording.timestamp) ? recording.timestamp : Date.now(),
            };
        })
        .filter(Boolean);
};

export const resolveRecordingSource = async (recording) => {
    if (!recording) return null;
    if (recording.dataUrl) return { url: recording.dataUrl, revoke: false };
    if (recording.blobKey) {
        const blob = await getBlob(recording.blobKey);
        if (!blob) return null;
        return { url: URL.createObjectURL(blob), revoke: true };
    }
    return null;
};
