const toFiniteDelay = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, numeric);
};

/**
 * Schedules a task using `scheduler.postTask`, `requestIdleCallback`, or a
 * timeout fallback.
 *
 * @param {() => void} task
 * @param {Object} [options={}]
 * @param {string} [options.priority='background']
 * @param {number} [options.delay=0]
 * @param {number} [options.idleTimeout=1500]
 * @param {number} [options.fallbackDelay=0]
 * @param {boolean} [options.delayBeforeIdle=false]
 * @returns {void}
 */
export const scheduleBackgroundTask = (
    task,
    {
        priority = 'background',
        delay = 0,
        idleTimeout = 1500,
        fallbackDelay = 0,
        delayBeforeIdle = false,
    } = {},
) => {
    if (typeof task !== 'function') return;
    const normalizedDelay = toFiniteDelay(delay, 0);
    const normalizedFallbackDelay = toFiniteDelay(fallbackDelay, 0);
    const normalizedTimeout = toFiniteDelay(idleTimeout, 1500);

    if (typeof window.scheduler?.postTask === 'function') {
        window.scheduler.postTask(task, {
            priority,
            delay: normalizedDelay,
        });
        return;
    }

    const runTask = () => {
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => task(), { timeout: normalizedTimeout });
            return;
        }
        window.setTimeout(() => task(), normalizedFallbackDelay);
    };

    if (delayBeforeIdle && normalizedDelay > 0) {
        window.setTimeout(runTask, normalizedDelay);
        return;
    }

    runTask();
};
