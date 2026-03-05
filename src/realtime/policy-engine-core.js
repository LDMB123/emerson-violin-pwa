import {
    CUE_STATES,
    confidenceBandFrom,
} from './contracts.js';
import { clamp, finiteOrNow, finiteOrZero } from '../utils/math.js';

const PRESET_BOUNDS = Object.freeze({
    gentle: Object.freeze({
        pitchToleranceCents: 12,
        rhythmToleranceMs: 120,
        cueCooldownMs: 1300,
    }),
    standard: Object.freeze({
        pitchToleranceCents: 8,
        rhythmToleranceMs: 90,
        cueCooldownMs: 1050,
    }),
    challenge: Object.freeze({
        pitchToleranceCents: 6,
        rhythmToleranceMs: 70,
        cueCooldownMs: 900,
    }),
});

export const HARD_RAILS = Object.freeze({
    oneCueAtATime: true,
    maxConsecutiveCorrections: 2,
    lowConfidenceFallbackFrames: 24,
    minCooldownMs: 800,
});


const getBounds = (preset) => PRESET_BOUNDS[preset] || PRESET_BOUNDS.standard;

const shouldRespectCooldown = (state, now) => {
    const bounds = getBounds(state.preset);
    const cooldown = clamp(bounds.cueCooldownMs, HARD_RAILS.minCooldownMs, 3000);
    return now - state.lastCueAt < cooldown;
};

const createCue = ({
    state,
    cueState,
    message,
    confidenceBand,
    domain,
    now,
    priority = 2,
    urgent = false,
    fallback = false,
}) => {
    const dwellMs = urgent && confidenceBand === 'high' ? 1000 : 1700;
    const validState = CUE_STATES.includes(cueState) ? cueState : 'retry-calm';
    return {
        id: `rt-cue-${state.cueCounter += 1}`,
        state: validState,
        message,
        confidenceBand,
        priority,
        dwellMs,
        domain,
        urgent,
        fallback,
        issuedAt: now,
        preset: state.preset,
    };
};

const emitCue = (state, cue, now) => {
    state.lastCueAt = now;
    state.lastCueState = cue.state;
    return cue;
};

const emitSystemCue = (state, {
    cueState,
    message,
    confidenceBand,
    now,
    priority = 1,
    fallback = false,
}) => emitCue(state, createCue({
    state,
    cueState,
    message,
    confidenceBand,
    domain: 'system',
    now,
    priority,
    fallback,
}), now);

export const evaluatePolicyFrame = (state, features = {}, context = {}) => {
    const now = finiteOrNow(context.now);
    const pitchCents = finiteOrZero(features.pitchCents);
    const rhythmOffsetMs = finiteOrZero(features.rhythmOffsetMs);
    const confidence = clamp(
        finiteOrZero(features.confidence),
        0,
        1,
    );
    const confidenceBand = confidenceBandFrom(confidence);
    const bounds = getBounds(state.preset);

    if (confidenceBand === 'low') {
        state.lowConfidenceFrames += 1;
        if (state.lowConfidenceFrames >= HARD_RAILS.lowConfidenceFallbackFrames) {
            state.lowConfidenceFrames = 0;
            state.consecutiveCorrections = 0;
            return emitSystemCue(state, {
                cueState: 'retry-calm',
                message: 'Let us use a helper tone for a moment.',
                confidenceBand,
                now,
                priority: 3,
                fallback: true,
            });
        }
        if (shouldRespectCooldown(state, now)) return null;
        return emitSystemCue(state, {
            cueState: 'listening',
            message: 'Listening for your sound...',
            confidenceBand,
            now,
            priority: 1,
        });
    }

    state.lowConfidenceFrames = 0;

    if (shouldRespectCooldown(state, now)) return null;

    if (
        (Math.abs(pitchCents) > bounds.pitchToleranceCents || Math.abs(rhythmOffsetMs) > bounds.rhythmToleranceMs)
        && state.consecutiveCorrections >= HARD_RAILS.maxConsecutiveCorrections
    ) {
        state.consecutiveCorrections = 0;
        return emitSystemCue(state, {
            cueState: 'retry-calm',
            message: 'Tiny reset. One slow bow, then try again.',
            confidenceBand,
            now,
            priority: 3,
        });
    }

    if (Math.abs(pitchCents) > bounds.pitchToleranceCents) {
        state.consecutiveCorrections += 1;
        const cue = createCue({
            state,
            cueState: pitchCents > 0 ? 'adjust-down' : 'adjust-up',
            message: pitchCents > 0 ? 'A little lower.' : 'A little higher.',
            confidenceBand,
            domain: 'pitch',
            now,
            priority: 3,
            urgent: Math.abs(pitchCents) > bounds.pitchToleranceCents * 2 && confidenceBand === 'high',
        });
        return emitCue(state, cue, now);
    }

    if (Math.abs(rhythmOffsetMs) > bounds.rhythmToleranceMs) {
        state.consecutiveCorrections += 1;
        const cue = createCue({
            state,
            cueState: rhythmOffsetMs > 0 ? 'adjust-up' : 'adjust-down',
            message: rhythmOffsetMs > 0 ? 'Bow a tiny bit sooner.' : 'Bow a tiny bit later.',
            confidenceBand,
            domain: 'rhythm',
            now,
            priority: 2,
            urgent: Math.abs(rhythmOffsetMs) > bounds.rhythmToleranceMs * 1.6 && confidenceBand === 'high',
        });
        return emitCue(state, cue, now);
    }

    state.consecutiveCorrections = 0;
    return emitSystemCue(state, {
        cueState: 'steady',
        message: 'Nice and steady.',
        confidenceBand,
        now,
        priority: 1,
    });
};

export const getBoundsForPreset = (preset) => ({ ...getBounds(preset) });
