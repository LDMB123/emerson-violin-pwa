import {
    RT_CUE,
    RT_FALLBACK,
} from '../utils/event-names.js';
import { confidenceBandFrom } from './contracts.js';
import { cloneFeature } from './session-feature-utils.js';
import { evaluateFrame } from './policy-engine.js';

export const createSessionPolicyProcessor = ({
    state,
    currentViewId,
    emitRealtimeEvent,
    policyWorkerClient,
    metricsProfile,
    publishState,
}) => {
    let lastCorrection = null;

    const processCueDecision = (cueDecision) => {
        if (!cueDecision) return;
        state.lastCue = cueDecision;
        state.cueState = cueDecision.state || 'listening';
        state.confidenceBand = cueDecision.confidenceBand || state.confidenceBand;
        state.quality.cues += 1;

        const isCorrection = cueDecision.state === 'adjust-up' || cueDecision.state === 'adjust-down';
        if (isCorrection) {
            state.quality.corrections += 1;
            if (
                lastCorrection
                && lastCorrection.state !== cueDecision.state
                && cueDecision.issuedAt - lastCorrection.issuedAt <= 2200
                && cueDecision.confidenceBand === 'high'
                && lastCorrection.confidenceBand === 'high'
            ) {
                state.quality.falseCorrections += 1;
            }
            lastCorrection = cueDecision;
        }

        emitRealtimeEvent(RT_CUE, cueDecision).catch(() => {});

        if (cueDecision.fallback) {
            state.fallbackMode = 'manual-drill';
            state.quality.fallbackCount += 1;
            emitRealtimeEvent(RT_FALLBACK, {
                sessionId: state.sessionId || 'none',
                reason: cueDecision.message,
                mode: 'manual-drill',
                at: Date.now(),
            }).catch(() => {});
        }
    };

    const applyCueDecision = (cueDecision) => {
        processCueDecision(cueDecision);
        publishState();
    };

    const evaluatePolicyLocally = (payload) => {
        const cueDecision = evaluateFrame(payload.features, payload.context);
        applyCueDecision(cueDecision);
    };

    const processPolicyEvalPayload = (payload) => {
        if (policyWorkerClient.ensureWorker()) {
            policyWorkerClient.evaluate(payload, {
                canApply: () => state.active && !state.paused,
                onDecision: (cueDecision) => {
                    applyCueDecision(cueDecision);
                },
            });
            return;
        }
        evaluatePolicyLocally(payload);
    };

    const buildPolicyEvalPayload = (feature) => ({
        features: {
            pitchCents: feature.cents - state.calibration.pitchBiasCents,
            rhythmOffsetMs: feature.rhythmOffsetMs - state.calibration.rhythmBiasMs,
            confidence: feature.confidence,
            hasSignal: feature.hasSignal,
            onset: feature.onset,
        },
        context: {
            now: Date.now(),
            viewId: currentViewId(),
        },
    });

    const processFeatureFrame = (frame) => {
        if (!state.active || state.paused) return;

        const feature = cloneFeature(frame);
        state.lastFeature = feature;
        state.confidenceBand = confidenceBandFrom(feature?.confidence || 0);

        metricsProfile.updateQuality(feature);
        metricsProfile.updateSessionCalibration(feature);
        metricsProfile.updateProfileCacheFromFeature(feature);
        metricsProfile.flushProfileCache().catch(() => {});

        processPolicyEvalPayload(buildPolicyEvalPayload(feature));
    };

    const handleFallbackReason = async (reason) => {
        state.fallbackMode = reason;
        await emitRealtimeEvent(RT_FALLBACK, {
            sessionId: state.sessionId || 'none',
            reason,
            mode: reason === 'mic-permission' ? 'mic-permission' : 'system',
            at: Date.now(),
        });
    };

    return {
        processFeatureFrame,
        handleFallbackReason,
    };
};
