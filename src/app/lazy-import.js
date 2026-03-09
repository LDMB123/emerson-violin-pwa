import { lazy } from 'react';
import {
    DEFAULT_RETRY_DELAY_MS,
    DEFAULT_RETRIABLE_ATTEMPTS,
    loadWithRetries,
    waitFor,
} from './import-retry.js';

export const loadNamedExportWithRetry = async ({
    loader,
    exportName,
    wait = waitFor,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    retriableAttempts = DEFAULT_RETRIABLE_ATTEMPTS,
} = {}) => {
    const module = await loadWithRetries({
        loader,
        wait,
        retryDelayMs,
        retriableAttempts,
    });

    const exported = module?.[exportName];
    if (!exported) {
        throw new Error(`[App] Missing export "${exportName}" in lazy module.`);
    }
    return { default: exported };
};

export const lazyNamedWithRetry = (loader, exportName, options) => lazy(() => (
    loadNamedExportWithRetry({ loader, exportName, ...options })
));
