const noop = () => {};

export const createPolicyWorkerClient = ({
    createWorker,
    onPolicyUpdate = noop,
} = {}) => {
    let worker = null;
    let workerAvailable = true;
    let requestId = 0;
    const pendingRequests = new Map();
    let evalInFlight = false;
    let queuedEvalPayload = null;

    const clearPendingRequests = () => {
        pendingRequests.forEach((pending) => {
            if (typeof pending?.resolve === 'function') {
                pending.resolve(null);
            }
            if (pending?.timer) {
                clearTimeout(pending.timer);
            }
        });
        pendingRequests.clear();
    };

    const teardown = () => {
        if (worker) {
            try {
                worker.terminate();
            } catch {
                // Ignore worker termination errors.
            }
            worker = null;
        }

        clearPendingRequests();
        evalInFlight = false;
        queuedEvalPayload = null;
    };

    const ensureWorker = () => {
        if (!workerAvailable) return false;
        if (worker) return true;
        if (typeof Worker === 'undefined' || typeof createWorker !== 'function') {
            workerAvailable = false;
            return false;
        }

        try {
            worker = createWorker();
            worker.onmessage = (event) => {
                const message = event.data || {};
                const nextRequestId = message.requestId;

                if (Number.isFinite(nextRequestId) && pendingRequests.has(nextRequestId)) {
                    const pending = pendingRequests.get(nextRequestId);
                    pendingRequests.delete(nextRequestId);
                    if (pending?.timer) clearTimeout(pending.timer);
                    pending?.resolve?.(message);
                }

                if (message.policy && typeof message.policy === 'object') {
                    onPolicyUpdate(message.policy);
                }
            };
            worker.onerror = (error) => {
                console.warn('[RealtimeSession] policy worker failed', error);
                workerAvailable = false;
                teardown();
            };
            return true;
        } catch (error) {
            console.warn('[RealtimeSession] failed to initialize policy worker', error);
            workerAvailable = false;
            teardown();
            return false;
        }
    };

    const request = (type, payload, timeoutMs = 120) => {
        if (!ensureWorker()) return Promise.resolve(null);

        const nextRequestId = (requestId += 1);
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                pendingRequests.delete(nextRequestId);
                resolve(null);
            }, timeoutMs);
            pendingRequests.set(nextRequestId, { resolve, timer });

            try {
                worker.postMessage({ type, payload, requestId: nextRequestId });
            } catch (error) {
                clearTimeout(timer);
                pendingRequests.delete(nextRequestId);
                resolve(null);
                console.warn('[RealtimeSession] policy worker message failed', error);
            }
        });
    };

    const evaluate = (payload, { canApply, onDecision } = {}) => {
        if (evalInFlight) {
            queuedEvalPayload = payload;
            return;
        }

        evalInFlight = true;
        request('evaluate', payload).then((message) => {
            if (typeof canApply === 'function' && !canApply()) return;
            if (typeof onDecision === 'function') {
                onDecision(message?.cueDecision || null);
            }
        }).finally(() => {
            evalInFlight = false;
            if (queuedEvalPayload) {
                const nextPayload = queuedEvalPayload;
                queuedEvalPayload = null;
                evaluate(nextPayload, { canApply, onDecision });
            }
        });
    };

    return {
        ensureWorker,
        request,
        evaluate,
        teardown,
    };
};
