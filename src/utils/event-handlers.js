import { runOnceBinding } from './lifecycle-utils.js';

const createTargetedDetailHandler = (
    expectedId,
    onMatch,
    detailKey = 'id',
) => (event) => {
    if (event?.detail?.[detailKey] !== expectedId) return;
    if (typeof onMatch === 'function') {
        onMatch(event);
    }
};

/**
 * Builds a refresh callback set for modules that only care about events targeted
 * to a specific entity ID.
 *
 * @param {string} expectedId
 * @param {(() => void) | null | undefined} refresh
 * @returns {{ refresh: () => void, handleUpdate: (event: Event & { detail?: Record<string, unknown> }) => void, handleReset: () => void }}
 */
export const createTargetedRefreshHandlers = (expectedId, refresh) => {
    const runRefresh = () => {
        if (typeof refresh === 'function') {
            refresh();
        }
    };
    return {
        refresh: runRefresh,
        handleUpdate: createTargetedDetailHandler(expectedId, runRefresh),
        handleReset: runRefresh,
    };
};

/**
 * Creates a handler that resolves derived state and then applies it.
 *
 * @param {(() => void) | null | undefined} resolve
 * @param {(() => void) | null | undefined} apply
 * @returns {() => void}
 */
export const createResolveThenApplyHandler = (resolve, apply) => () => {
    if (typeof resolve === 'function') {
        resolve();
    }
    if (typeof apply === 'function') {
        apply();
    }
};

const bindDocumentEvents = (eventNames, handler, target = document) => {
    if (!Array.isArray(eventNames) || typeof handler !== 'function' || !target) return;
    eventNames.forEach((eventName) => {
        if (typeof eventName !== 'string' || !eventName) return;
        target.addEventListener(eventName, handler);
    });
};

/**
 * Creates a one-shot binder for document-style events.
 * The returned function uses `runOnceBinding` so listeners are only registered once.
 *
 * @param {() => boolean} claimBinding
 * @param {string[]} eventNames
 * @param {(event: Event) => void} handler
 * @param {EventTarget} [target=document]
 * @returns {() => void}
 */
export const createRunOnceDocumentBinder = (
    claimBinding,
    eventNames,
    handler,
    target = document,
) => () => runOnceBinding(claimBinding, () => {
    bindDocumentEvents(eventNames, handler, target);
});
