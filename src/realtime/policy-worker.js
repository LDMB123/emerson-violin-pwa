import { evaluateFrame, applyParentPreset, getPolicyState } from './policy-engine.js';

self.onmessage = async (event) => {
    const message = event.data || {};
    const { type, payload = {}, requestId } = message;

    if (type === 'evaluate') {
        const cueDecision = evaluateFrame(payload.features || {}, payload.context || {});
        self.postMessage({
            type: 'evaluate-result',
            requestId,
            cueDecision,
            policy: getPolicyState(),
        });
        return;
    }

    if (type === 'apply-preset') {
        const preset = await applyParentPreset(payload.preset);
        self.postMessage({
            type: 'apply-preset-result',
            requestId,
            preset,
            policy: getPolicyState(),
        });
        return;
    }

    self.postMessage({
        type: 'unknown',
        requestId,
        policy: getPolicyState(),
    });
};
