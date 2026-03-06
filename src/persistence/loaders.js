import { appendJSONItem, getJSON, setJSON, getBlob } from './storage.js';
import { EVENTS_KEY, RECORDINGS_KEY } from './storage-keys.js';
import { clampRounded, finiteOrNow, positiveRound, dayFromTimestamp } from '../utils/math.js';
import { mapArrayEntries } from '../utils/storage-utils.js';

const clampScore = (value, max = 100) => {
    const score = Number(value);
    if (!Number.isFinite(score)) return null;
    return clampRounded(score, 0, max);
};

const normalizeSongStars = (event, accuracy) => {
    if (Number.isFinite(event?.stars)) {
        return clampRounded(event.stars, 0, 5);
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
    if (!event || typeof event !== 'object') {
        return { event: null, changed: true };
    }
    const timestamp = finiteOrNow(event.timestamp);
    const day = Number.isFinite(event.day) ? event.day : dayFromTimestamp(timestamp);
    let changed = timestamp !== event.timestamp || day !== event.day;
    let normalized = changed
        ? {
            ...event,
            timestamp,
            day,
        }
        : event;

    const ensureClone = () => {
        if (normalized === event) {
            normalized = {
                ...event,
                timestamp,
                day,
            };
        }
    };

    const assignIfChanged = (key, value) => {
        if (normalized[key] === value) return;
        ensureClone();
        normalized[key] = value;
        changed = true;
    };

    if (event.type === 'game') {
        const score = clampScore(event.score);
        const accuracy = clampScore(event.accuracy ?? event.score);
        assignIfChanged('score', score ?? 0);
        assignIfChanged('accuracy', accuracy ?? 0);
        if (!normalized.difficulty && typeof event.mode === 'string') {
            assignIfChanged('difficulty', event.mode);
        }
        if (!normalized.tier && typeof event.level === 'string') {
            assignIfChanged('tier', event.level);
        }
        if (!Number.isFinite(normalized.objectiveTotal) && Number.isFinite(event?.objectives?.total)) {
            assignIfChanged('objectiveTotal', positiveRound(event.objectives.total));
        }
        if (!Number.isFinite(normalized.objectivesCompleted) && Number.isFinite(event?.objectives?.completed)) {
            assignIfChanged('objectivesCompleted', positiveRound(event.objectives.completed));
        }
        if (!Number.isFinite(normalized.mistakes) && Number.isFinite(event?.misses)) {
            assignIfChanged('mistakes', positiveRound(event.misses));
        }
    }

    if (event.type === 'song') {
        const accuracy = clampScore(event.accuracy ?? event.score);
        const timingAccuracy = clampScore(event.timingAccuracy ?? accuracy);
        const intonationAccuracy = clampScore(event.intonationAccuracy ?? accuracy);
        assignIfChanged('accuracy', accuracy ?? 0);
        assignIfChanged('timingAccuracy', timingAccuracy ?? 0);
        assignIfChanged('intonationAccuracy', intonationAccuracy ?? 0);
        assignIfChanged('stars', normalizeSongStars(event, accuracy));
        if (!normalized.attemptType) {
            assignIfChanged('attemptType', normalized.sectionId ? 'section' : 'full');
        }
        if (!Number.isFinite(normalized.tempo) && Number.isFinite(event.bpm)) {
            assignIfChanged('tempo', Math.max(30, Math.round(event.bpm)));
        }
    }

    if (event.type === 'practice') {
        assignIfChanged('minutes', Number.isFinite(event.minutes) ? Math.max(0, event.minutes) : 0);
    }

    return { event: normalized, changed };
};

/** Normalizes stored event records and reports whether any migration occurred. */
export const migrateEventShape = (events) => {
    if (!Array.isArray(events)) {
        return { events: [], changed: true };
    }

    let changed = false;
    const next = events
        .map((event) => {
            const result = normalizeEvent(event);
            if (!result.event) {
                changed = true;
                return null;
            }
            if (result.changed) {
                changed = true;
            }
            return result.event;
        })
        .filter(Boolean);

    return { events: next, changed };
};

/** Loads persisted events, migrating them to the current event schema if needed. */
export const loadEvents = async () => {
    const stored = await getJSON(EVENTS_KEY);
    const migrated = migrateEventShape(stored);
    if (migrated.changed) {
        await setJSON(EVENTS_KEY, migrated.events);
    }
    return migrated.events;
};

/** Persists the normalized event list. */
export const saveEvents = async (events) => {
    await setJSON(EVENTS_KEY, events);
};

/** Appends one normalized event entry without rewriting the full event history. */
export const appendEvent = async (event, { maxEntries = Infinity } = {}) => {
    const migrated = normalizeEvent(event);
    if (!migrated.event) return null;
    await appendJSONItem(EVENTS_KEY, migrated.event, { maxEntries });
    return migrated.event;
};

/** Loads persisted recording metadata and normalizes required identifiers. */
export const loadRecordings = async () => {
    const stored = await getJSON(RECORDINGS_KEY);
    return mapArrayEntries(stored, (recording) => {
        if (!recording || typeof recording !== 'object') return null;
        return {
            ...recording,
            id: recording.id || `recording-${recording.timestamp || Date.now()}`,
            timestamp: finiteOrNow(recording.timestamp),
        };
    });
};

/** Resolves a playable URL for a stored recording and whether it must be revoked. */
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
