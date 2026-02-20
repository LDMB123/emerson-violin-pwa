import { RT_PARENT_OVERRIDE } from '../utils/event-names.js';
import { applyParentPreset, getPolicyState } from './policy-engine.js';

export const createSessionPresetController = ({
    state,
    emitRealtimeEvent,
    policyWorkerClient,
}) => {
    const applyParentPresetLocally = async (preset) => {
        const nextPreset = await applyParentPreset(preset);
        state.policyCache = getPolicyState();
        return nextPreset;
    };

    const setParentPreset = async (preset, source = 'parent-zone') => {
        const previousPreset = (state.policyCache || getPolicyState()).preset;
        let nextPreset = previousPreset;

        if (policyWorkerClient.ensureWorker()) {
            const message = await policyWorkerClient.request('apply-preset', { preset }, 180);
            if (message?.preset) {
                nextPreset = message.preset;
            } else {
                nextPreset = await applyParentPresetLocally(preset);
            }
        } else {
            nextPreset = await applyParentPresetLocally(preset);
        }

        if (nextPreset !== previousPreset) {
            await emitRealtimeEvent(RT_PARENT_OVERRIDE, {
                preset: nextPreset,
                previousPreset,
                at: Date.now(),
                source,
            });
        }
        return nextPreset;
    };

    return {
        setParentPreset,
    };
};
