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
