const defaultSetInterval = (...args) => globalThis.setInterval(...args);
const defaultClearInterval = (...args) => globalThis.clearInterval(...args);

/**
 * Creates a small interval-backed ticker with start/stop state helpers.
 *
 * @param {Object} [options={}]
 * @param {(() => void) | null} [options.onTick=null]
 * @param {number} [options.intervalMs=1000]
 * @param {typeof setInterval} [options.setIntervalFn=defaultSetInterval]
 * @param {typeof clearInterval} [options.clearIntervalFn=defaultClearInterval]
 * @returns {{
 *   start: () => boolean,
 *   stop: () => boolean,
 *   isRunning: () => boolean,
 *   getId: () => number | null
 * }}
 */
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
