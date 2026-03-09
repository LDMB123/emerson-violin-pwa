import { tryRun } from './safe-execution.js';
import { getJSON, setJSON } from '../persistence/storage.js';

const getLocalStorage = () => {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
};

/**
 * Reads a string array from storage, filtering blanks and duplicates.
 *
 * @param {string} key
 * @param {Storage} [storage]
 * @returns {string[]}
 */
export const readStringArrayFromStorage = (key, storage = getLocalStorage()) => {
    try {
        if (!storage) return [];
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
 * @param {Storage} [storage]
 * @returns {void}
 */
export const writeStringArrayToStorage = (key, array, storage = getLocalStorage()) => {
    try {
        if (!storage) return;
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
 * @param {Storage} [options.storage]
 * @param {any} [options.fallback=null]
 * @returns {any}
 */
export const readJsonFromStorage = (
    key,
    {
        storage = getLocalStorage(),
        fallback = null,
    } = {},
) => {
    try {
        if (!storage) return fallback;
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
 * @param {Storage} [storage]
 * @returns {boolean}
 */
export const writeJsonToStorage = (
    key,
    value,
    storage = getLocalStorage(),
) => tryRun(() => {
    if (!storage) return;
    const serialized = JSON.stringify(value);
    if (storage.getItem(key) === serialized) return;
    storage.setItem(key, serialized);
});

/**
 * Async read from IndexedDB wrapper.
 * @param {string} key 
 * @param {any} [fallback=null] 
 */
export const readJsonAsync = async (key, fallback = null) => {
    try {
        const val = await getJSON(key);
        return val !== null && val !== undefined ? val : fallback;
    } catch {
        return fallback;
    }
};

/**
 * Async write to IndexedDB wrapper.
 * @param {string} key 
 * @param {any} value 
 */
export const writeJsonAsync = async (key, value) => {
    try {
        await setJSON(key, value);
        return true;
    } catch {
        return false;
    }
};

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
