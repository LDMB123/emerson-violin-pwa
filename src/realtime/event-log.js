import { getJSON, setJSON } from '../persistence/storage.js';
import { RT_EVENT_LOG_KEY, RT_QUALITY_KEY } from '../persistence/storage-keys.js';

const MAX_RT_EVENTS = 1500;

const normalizeEvents = (value) => (Array.isArray(value) ? value : []);

/** Loads the persisted realtime event log. */
export const loadRealtimeEvents = async () => {
    const stored = await getJSON(RT_EVENT_LOG_KEY);
    return normalizeEvents(stored);
};

/** Appends one realtime event to the capped persisted event log. */
export const appendRealtimeEvent = async (type, detail) => {
    if (!type) return [];
    const events = await loadRealtimeEvents();
    events.push({
        type,
        detail,
        timestamp: Date.now(),
    });
    const trimmed = events.slice(-MAX_RT_EVENTS);
    await setJSON(RT_EVENT_LOG_KEY, trimmed);
    return trimmed;
};



/** Loads the last persisted realtime quality snapshot. */
export const loadRealtimeQuality = async () => {
    const stored = await getJSON(RT_QUALITY_KEY);
    if (!stored || typeof stored !== 'object') return null;
    return stored;
};

/** Persists the latest realtime quality snapshot. */
export const saveRealtimeQuality = async (quality) => {
    if (!quality || typeof quality !== 'object') return;
    await setJSON(RT_QUALITY_KEY, quality);
};
