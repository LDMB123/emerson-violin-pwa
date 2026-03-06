import { tryRun } from './safe-execution.js';

/**
 * Reads a string array from storage, filtering blanks and duplicates.
 *
 * @param {string} key
 * @param {Storage} [storage=window.localStorage]
 * @returns {string[]}
 */
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

/**
 * Persists a string array to storage.
 *
 * @param {string} key
 * @param {string[]} array
 * @param {Storage} [storage=window.localStorage]
 * @returns {void}
 */
export const writeStringArrayToStorage = (key, array, storage = window.localStorage) => {
    try {
        storage.setItem(key, JSON.stringify(array));
    } catch {
        // Ignore local storage write failures.
    }
};

/**
 * Reads JSON from storage with a fallback value.
 *
 * @param {string} key
 * @param {Object} [options={}]
 * @param {Storage} [options.storage=window.localStorage]
 * @param {any} [options.fallback=null]
 * @returns {any}
 */
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

/**
 * Writes a JSON-serializable value to storage.
 *
 * @param {string} key
 * @param {any} value
 * @param {Storage} [storage=window.localStorage]
 * @returns {boolean}
 */
export const writeJsonToStorage = (
    key,
    value,
    storage = window.localStorage,
) => tryRun(() => {
    const serialized = JSON.stringify(value);
    if (storage.getItem(key) === serialized) return;
    storage.setItem(key, serialized);
});

/**
 * Returns the value when it is an object, otherwise the fallback.
 *
 * @param {any} value
 * @param {Record<string, any>} [fallback={}]
 * @returns {Record<string, any>}
 */
export const asObjectOrFallback = (value, fallback = {}) => (
    value && typeof value === 'object' ? value : fallback
);

/**
 * Maps array entries and removes falsy results.
 *
 * @template T,U
 * @param {T[]} value
 * @param {(entry: T) => U} mapper
 * @returns {U[]}
 */
export const mapArrayEntries = (value, mapper) => {
    if (!Array.isArray(value) || typeof mapper !== 'function') return [];
    return value.map(mapper).filter(Boolean);
};
