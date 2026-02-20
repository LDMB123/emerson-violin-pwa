export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

export const safeStop = (node) => {
    if (!node || typeof node.stop !== 'function') return;
    try {
        node.stop();
    } catch {
        // Ignore stop errors.
    }
};

export const disconnectNodes = (nodes = []) => {
    nodes.forEach((node) => {
        if (node && typeof node.disconnect === 'function') {
            node.disconnect();
        }
    });
};
