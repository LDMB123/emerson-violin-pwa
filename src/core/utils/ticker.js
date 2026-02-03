const subscribers = new Set();
let timerId = null;

const getInterval = () => (document.documentElement?.dataset?.perfMode === 'high' ? 500 : 1000);

const tick = () => {
    if (document.hidden) return;
    const now = Date.now();
    subscribers.forEach((fn) => {
        try {
            fn(now);
        } catch {
            // Ignore subscriber errors.
        }
    });
};

const start = () => {
    if (timerId || !subscribers.size) return;
    timerId = window.setInterval(tick, getInterval());
};

const stop = () => {
    if (!timerId) return;
    window.clearInterval(timerId);
    timerId = null;
};

const updateInterval = () => {
    if (!timerId) return;
    stop();
    start();
};

const onVisibilityChange = () => {
    if (document.hidden) {
        stop();
        return;
    }
    start();
    tick();
};

document.addEventListener('visibilitychange', onVisibilityChange);
document.addEventListener('panda:performance-mode-change', updateInterval);

export const registerUiTicker = (fn) => {
    if (typeof fn !== 'function') return () => {};
    subscribers.add(fn);
    if (!document.hidden) {
        start();
    }
    return () => {
        subscribers.delete(fn);
        if (!subscribers.size) {
            stop();
        }
    };
};
