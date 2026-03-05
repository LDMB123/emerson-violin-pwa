export const tryRun = (operation, fallback = false) => {
    try {
        operation();
        return true;
    } catch {
        return fallback;
    }
};

export const tryRunAsync = async (operation, fallback = false) => {
    return Promise.resolve()
        .then(() => operation())
        .then(() => true)
        .catch(() => fallback);
};
