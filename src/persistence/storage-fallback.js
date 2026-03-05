import {
    readJsonFromStorage,
    writeJsonToStorage,
} from '../utils/storage-utils.js';

const FALLBACK_PREFIX = 'panda-violin:kv:';

const fallbackKey = (key) => `${FALLBACK_PREFIX}${key}`;

export const fallbackGetJSON = (key) => readJsonFromStorage(fallbackKey(key));

export const fallbackSetJSON = (key, value) => {
    const saved = writeJsonToStorage(fallbackKey(key), value);
    if (!saved) {
        // Ignore storage quota or privacy-mode failures.
    }
};

export const fallbackRemoveJSON = (key) => {
    try {
        window.localStorage.removeItem(fallbackKey(key));
    } catch {
        // Ignore storage failures.
    }
};
