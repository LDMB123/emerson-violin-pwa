import { createSessionPolicyProcessor } from './session-runtime-policy-processor.js';
import { createSessionPresetController } from './session-runtime-preset-controller.js';
import { createSessionStatePublisher } from './session-runtime-state-publisher.js';

export const createSessionRuntimeEngine = ({
    state,
    currentViewId,
    emitRealtimeEvent,
    policyWorkerClient,
    metricsProfile,
}) => {
    const statePublisher = createSessionStatePublisher({
        state,
        currentViewId,
        emitRealtimeEvent,
    });

    const policyProcessor = createSessionPolicyProcessor({
        state,
        currentViewId,
        emitRealtimeEvent,
        policyWorkerClient,
        metricsProfile,
        publishState: statePublisher.publishState,
    });

    const presetController = createSessionPresetController({
        state,
        emitRealtimeEvent,
        policyWorkerClient,
    });

    return {
        publishState: statePublisher.publishState,
        syncPolicyCache: statePublisher.syncPolicyCache,
        processFeatureFrame: policyProcessor.processFeatureFrame,
        handleFallbackReason: policyProcessor.handleFallbackReason,
        setParentPreset: presetController.setParentPreset,
        getSessionState: statePublisher.getSessionState,
    };
};
