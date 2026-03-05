import { tryRun } from './safe-execution.js';

export const readStringArrayFromStorage = (key, storage = window.localStorage) => {
    try {
        const stored = JSON.parse(storage.getItem(key) || '[]');
        if (!Array.isArray(stored)) return [];
        return stored.filter((value, index, list) => (
            typeof value === 'string'
            && value.trim()
            && list.indexOf(value) === index
        ));
    } catch {
        return [];
    }
};

export const writeStringArrayToStorage = (key, array, storage = window.localStorage) => {
    try {
        storage.setItem(key, JSON.stringify(array));
    } catch {
        // Ignore local storage write failures.
    }
};

export const readJsonFromStorage = (
    key,
    {
        storage = window.localStorage,
        fallback = null,
    } = {},
) => {
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

export const writeJsonToStorage = (
    key,
    value,
    storage = window.localStorage,
) => tryRun(() => {
    storage.setItem(key, JSON.stringify(value));
});

export const asObjectOrFallback = (value, fallback = {}) => (
    value && typeof value === 'object' ? value : fallback
);

export const mapArrayEntries = (value, mapper) => {
    if (!Array.isArray(value) || typeof mapper !== 'function') return [];
    return value.map(mapper).filter(Boolean);
};
