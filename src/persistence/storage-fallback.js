const FALLBACK_PREFIX = 'panda-violin:kv:';

const fallbackKey = (key) => `${FALLBACK_PREFIX}${key}`;

export const fallbackGetJSON = (key) => {
    try {
        const raw = window.localStorage.getItem(fallbackKey(key));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const fallbackSetJSON = (key, value) => {
    try {
        window.localStorage.setItem(fallbackKey(key), JSON.stringify(value));
    } catch {
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
