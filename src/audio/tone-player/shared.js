/** Resolves after the requested delay in milliseconds. */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Writes an AudioParam-like value, optionally using a scheduled setter method. */
export const setParam = (param, value, time = 0, method = null) => {
    if (!param) return;
    if (method && typeof param[method] === 'function') {
        param[method](value, time);
        return;
    }
    if ('value' in param) {
        param.value = value;
    }
};

/** Stops an AudioNode/AudioScheduledSourceNode while ignoring repeat-stop errors. */
export const safeStop = (node) => {
    if (!node || typeof node.stop !== 'function') return;
    try {
        node.stop();
    } catch {
        // Ignore stop errors.
    }
};

/** Disconnects each provided audio node if it supports `disconnect()`. */
export const disconnectNodes = (nodes = []) => {
    nodes.forEach((node) => {
        if (node && typeof node.disconnect === 'function') {
            node.disconnect();
        }
    });
};
