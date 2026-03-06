import { getJSON, setJSON } from '../persistence/storage.js';
import { RT_EVENT_LOG_KEY, RT_QUALITY_KEY } from '../persistence/storage-keys.js';

const MAX_RT_EVENTS = 1500;
const EVENT_PERSIST_DEBOUNCE_MS = 250;

const normalizeEvents = (value) => (Array.isArray(value) ? value : []);

let eventsCache = null;
let eventsLoadPromise = null;
let eventsPersistPromise = null;
let eventsPersistTimer = null;
let eventMutationChain = Promise.resolve();
let eventsDirty = false;

const cloneEvents = (events) => (Array.isArray(events) ? events.slice() : []);

const clearEventsPersistTimer = () => {
    if (eventsPersistTimer === null) return;
    clearTimeout(eventsPersistTimer);
    eventsPersistTimer = null;
};

const ensureEventsCache = async () => {
    if (Array.isArray(eventsCache)) return eventsCache;
    if (eventsLoadPromise) return eventsLoadPromise;
    eventsLoadPromise = getJSON(RT_EVENT_LOG_KEY)
        .then((stored) => {
            eventsCache = cloneEvents(normalizeEvents(stored));
            return eventsCache;
        })
        .finally(() => {
            eventsLoadPromise = null;
        });
    return eventsLoadPromise;
};

const persistEventsCache = async () => {
    clearEventsPersistTimer();
    if (eventsPersistPromise) {
        await eventsPersistPromise;
        return;
    }
    if (!eventsDirty) return;

    const snapshot = cloneEvents(eventsCache);
    eventsDirty = false;
    eventsPersistPromise = setJSON(RT_EVENT_LOG_KEY, snapshot)
        .catch((error) => {
            eventsDirty = true;
            throw error;
        })
        .finally(() => {
            eventsPersistPromise = null;
        });

    await eventsPersistPromise;
};

const scheduleEventPersist = (delayMs = EVENT_PERSIST_DEBOUNCE_MS) => {
    if (!eventsDirty || eventsPersistTimer !== null) return;
    eventsPersistTimer = setTimeout(() => {
        eventsPersistTimer = null;
        void persistEventsCache().catch(() => {});
    }, Math.max(0, delayMs));
};

const queueEventMutation = (mutation) => {
    const nextMutation = eventMutationChain.then(mutation);
    eventMutationChain = nextMutation.then(() => undefined, () => undefined);
    return nextMutation;
};

/** Loads the persisted realtime event log. */
export const loadRealtimeEvents = async () => {
    await eventMutationChain;
    const events = await ensureEventsCache();
    return cloneEvents(events);
};

/** Appends one realtime event to the capped persisted event log. */
export const appendRealtimeEvent = async (type, detail) => {
    if (!type) return [];
    return queueEventMutation(async () => {
        const events = await ensureEventsCache();
        events.push({
            type,
            detail,
            timestamp: Date.now(),
        });
        if (events.length > MAX_RT_EVENTS) {
            events.splice(0, events.length - MAX_RT_EVENTS);
        }
        eventsDirty = true;
        scheduleEventPersist();
        return cloneEvents(events);
    });
};

/** Forces any buffered realtime events to persist and returns the latest log snapshot. */
export const flushRealtimeEvents = async () => {
    await eventMutationChain;
    await ensureEventsCache();
    try {
        await persistEventsCache();
    } catch {
        // Keep in-memory events available even if persistence fails.
    }
    return cloneEvents(eventsCache);
};

/** Clears the realtime event log cache and persistence store. */
export const clearRealtimeEvents = async () => queueEventMutation(async () => {
    await ensureEventsCache();
    eventsCache = [];
    eventsDirty = true;
    try {
        await persistEventsCache();
    } catch {
        // Ignore clear failures and keep the in-memory cache empty.
    }
    return [];
});


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
