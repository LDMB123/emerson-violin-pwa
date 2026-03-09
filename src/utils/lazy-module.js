export const createRetryableModuleLoader = (loadModule) => {
    let pendingPromise = null;

    return async () => {
        if (!pendingPromise) {
            pendingPromise = Promise.resolve()
                .then(loadModule)
                .catch((error) => {
                    pendingPromise = null;
                    throw error;
                });
        }

        return pendingPromise;
    };
};
