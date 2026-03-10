const CHILD_NAME_KEYS = [
    'panda-violin:child-name-v1',
    'emerson_violin_child_name',
    'CHILD_NAME_KEY',
];

const trimName = (value) => (typeof value === 'string' ? value.trim().slice(0, 40) : '');

const decodeStoredName = (rawValue) => {
    if (typeof rawValue !== 'string' || !rawValue.trim()) return '';
    try {
        const parsed = JSON.parse(rawValue);
        if (typeof parsed === 'string') {
            return trimName(parsed);
        }
    } catch {
        // Older builds persisted the raw string directly.
    }
    return trimName(rawValue);
};

/** Reads the learner's saved display name from any supported storage key. */
export const readChildName = (storage = globalThis?.localStorage) => {
    if (!storage) return '';
    for (const key of CHILD_NAME_KEYS) {
        const value = decodeStoredName(storage.getItem(key));
        if (value) return value;
    }
    return '';
};

/** Persists the learner's display name using a JSON-safe value across legacy keys. */
export const persistChildName = (name, storage = globalThis?.localStorage) => {
    if (!storage) return '';
    const nextName = trimName(name);

    for (const key of CHILD_NAME_KEYS) {
        if (!nextName) {
            storage.removeItem(key);
        } else {
            storage.setItem(key, JSON.stringify(nextName));
        }
    }

    return nextName;
};
