import { runOnceBinding } from './lifecycle-utils.js';

export const createTargetedDetailHandler = (
    expectedId,
    onMatch,
    detailKey = 'id',
) => (event) => {
    if (event?.detail?.[detailKey] !== expectedId) return;
    if (typeof onMatch === 'function') {
        onMatch(event);
    }
};

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

export const createResolveThenApplyHandler = (resolve, apply) => () => {
    if (typeof resolve === 'function') {
        resolve();
    }
    if (typeof apply === 'function') {
        apply();
    }
};

export const bindDocumentEvents = (eventNames, handler, target = document) => {
    if (!Array.isArray(eventNames) || typeof handler !== 'function' || !target) return;
    eventNames.forEach((eventName) => {
        if (typeof eventName !== 'string' || !eventName) return;
        target.addEventListener(eventName, handler);
    });
};

export const createRunOnceDocumentBinder = (
    claimBinding,
    eventNames,
    handler,
    target = document,
) => () => runOnceBinding(claimBinding, () => {
    bindDocumentEvents(eventNames, handler, target);
});
