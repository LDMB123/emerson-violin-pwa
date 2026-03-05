import {
    readJsonFromStorage,
    writeJsonToStorage,
} from '../utils/storage-utils.js';

const FALLBACK_PREFIX = 'panda-violin:kv:';

const fallbackKey = (key) => `${FALLBACK_PREFIX}${key}`;

/** Reads a JSON fallback value from localStorage. */
export const fallbackGetJSON = (key) => readJsonFromStorage(fallbackKey(key));

/** Writes a JSON fallback value to localStorage. */
export const fallbackSetJSON = (key, value) => {
    const saved = writeJsonToStorage(fallbackKey(key), value);
    if (!saved) {
        // Ignore storage quota or privacy-mode failures.
    }
};

/** Removes a JSON fallback value from localStorage. */
export const fallbackRemoveJSON = (key) => {
    try {
        window.localStorage.removeItem(fallbackKey(key));
    } catch {
        // Ignore storage failures.
    }
};
