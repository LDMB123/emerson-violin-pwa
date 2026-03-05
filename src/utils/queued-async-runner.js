/**
 * Creates a runner that allows only one async task execution at a time.
 * Calls made while the task is in flight are collapsed into one trailing rerun.
 * Task failures are intentionally swallowed so callers can fire-and-forget.
 *
 * @param {(() => Promise<unknown> | unknown) | null | undefined} task
 * @returns {() => Promise<unknown | null | undefined>} Runner that starts work
 * and resolves when its invocation settles. Calls made mid-flight join the
 * current run and request one trailing rerun.
 */
export const createQueuedAsyncRunner = (task) => {
    if (typeof task !== 'function') {
        return async () => null;
    }

    let inFlight = null;
    let queued = false;

    const run = async () => {
        if (inFlight) {
            queued = true;
            return inFlight;
        }

        inFlight = Promise.resolve()
            .then(task)
            .catch(() => { })
            .finally(() => {
                inFlight = null;
            });
        await inFlight;

        if (queued) {
            queued = false;
            return run();
        }
        return null;
    };

    return run;
};
