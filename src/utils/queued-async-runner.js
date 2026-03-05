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

