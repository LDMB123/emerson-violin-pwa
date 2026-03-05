const defaultSetInterval = (...args) => globalThis.setInterval(...args);
const defaultClearInterval = (...args) => globalThis.clearInterval(...args);

export const createIntervalTicker = ({
    onTick = null,
    intervalMs = 1000,
    setIntervalFn = defaultSetInterval,
    clearIntervalFn = defaultClearInterval,
} = {}) => {
    let intervalId = null;

    const isRunning = () => intervalId !== null;

    const start = () => {
        if (isRunning()) return false;
        if (typeof onTick !== 'function') return false;
        intervalId = setIntervalFn(onTick, intervalMs);
        return true;
    };

    const stop = () => {
        if (!isRunning()) return false;
        clearIntervalFn(intervalId);
        intervalId = null;
        return true;
    };

    return {
        start,
        stop,
        isRunning,
        getId: () => intervalId,
    };
};
