export const DEFAULT_RETRY_DELAY_MS = 80;
export const DEFAULT_RETRIABLE_ATTEMPTS = 1;

export const waitFor = (delayMs) => new Promise((resolve) => {
    globalThis.setTimeout(resolve, Math.max(0, Number(delayMs) || 0));
});

export const isRetriableImportError = (error) => {
    if (!error) return false;
    if (error instanceof TypeError) return true;
    const message = String(error?.message || '').toLowerCase();
    return (
        message.includes('module script')
        || message.includes('import')
        || message.includes('preload css')
        || message.includes('unable to preload css')
    );
};

export const loadWithRetries = async ({
    loader,
    wait = waitFor,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    retriableAttempts = DEFAULT_RETRIABLE_ATTEMPTS,
} = {}) => {
    let attempt = 0;

    while (attempt <= retriableAttempts) {
        try {
            return await loader();
        } catch (error) {
            if (!isRetriableImportError(error) || attempt >= retriableAttempts) {
                throw error;
            }
            attempt += 1;
            await wait(retryDelayMs);
        }
    }

    return null;
};
