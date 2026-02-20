import { loadEvents, saveEvents } from '../persistence/loaders.js';
import { clamp, todayDay } from '../utils/math.js';
import { SONG_RECORDED } from '../utils/event-names.js';
import { updateSongProgress } from './song-progression.js';

const tierFromAccuracy = (accuracy) => {
    if (accuracy >= 95) return 100;
    if (accuracy >= 75) return 75;
    if (accuracy >= 50) return 50;
    if (accuracy >= 25) return 25;
    return 0;
};

export const recordSongEvent = async (
    songId,
    accuracyOrPayload,
    duration,
    elapsed,
    onUpdated = () => {},
) => {
    const events = await loadEvents();
    const payload = (accuracyOrPayload && typeof accuracyOrPayload === 'object')
        ? accuracyOrPayload
        : { accuracy: accuracyOrPayload, duration, elapsed };
    const rounded = clamp(Math.round(payload.accuracy || 0), 0, 100);
    const entry = {
        type: 'song',
        id: songId,
        accuracy: rounded,
        tier: tierFromAccuracy(rounded),
        duration: Number.isFinite(payload.duration) ? payload.duration : duration,
        elapsed: Number.isFinite(payload.elapsed) ? payload.elapsed : elapsed,
        day: todayDay(),
        timestamp: Date.now(),
    };
    if (typeof payload.sectionId === 'string' && payload.sectionId.trim()) {
        entry.sectionId = payload.sectionId.trim();
    }
    if (Number.isFinite(payload.tempo)) entry.tempo = Math.max(30, Math.round(payload.tempo));
    if (Number.isFinite(payload.timingAccuracy)) entry.timingAccuracy = clamp(Math.round(payload.timingAccuracy), 0, 100);
    if (Number.isFinite(payload.intonationAccuracy)) entry.intonationAccuracy = clamp(Math.round(payload.intonationAccuracy), 0, 100);
    if (Number.isFinite(payload.stars)) entry.stars = clamp(Math.round(payload.stars), 0, 5);
    if (typeof payload.attemptType === 'string' && payload.attemptType.trim()) {
        entry.attemptType = payload.attemptType.trim();
    }
    events.push(entry);
    await saveEvents(events);
    await updateSongProgress(songId, entry);
    document.dispatchEvent(new CustomEvent(SONG_RECORDED, { detail: entry }));
    onUpdated(events);
};
