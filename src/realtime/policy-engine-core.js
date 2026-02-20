import {
    CUE_STATES,
    confidenceBandFrom,
} from './contracts.js';

const PRESET_BOUNDS = Object.freeze({
    gentle: Object.freeze({
        pitchToleranceCents: 12,
        rhythmToleranceMs: 120,
        frustrationLimit: 3,
        cueCooldownMs: 1300,
    }),
    standard: Object.freeze({
        pitchToleranceCents: 8,
        rhythmToleranceMs: 90,
        frustrationLimit: 2,
        cueCooldownMs: 1050,
    }),
    challenge: Object.freeze({
        pitchToleranceCents: 6,
        rhythmToleranceMs: 70,
        frustrationLimit: 2,
        cueCooldownMs: 900,
    }),
});

export const HARD_RAILS = Object.freeze({
    oneCueAtATime: true,
    maxConsecutiveCorrections: 2,
    lowConfidenceFallbackFrames: 24,
    minCooldownMs: 800,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

export const evaluatePolicyFrame = (state, features = {}, context = {}) => {
    const now = Number.isFinite(context.now) ? context.now : Date.now();
    const pitchCents = Number.isFinite(features.pitchCents) ? features.pitchCents : 0;
    const rhythmOffsetMs = Number.isFinite(features.rhythmOffsetMs) ? features.rhythmOffsetMs : 0;
    const confidence = clamp(
        Number.isFinite(features.confidence) ? features.confidence : 0,
        0,
        1,
    );
    const frustration = clamp(
        Number.isFinite(context.frustrationScore) ? context.frustrationScore : 0,
        0,
        5,
    );
    const confidenceBand = confidenceBandFrom(confidence);
    const bounds = getBounds(state.preset);

    if (confidenceBand === 'low') {
        state.lowConfidenceFrames += 1;
        if (state.lowConfidenceFrames >= HARD_RAILS.lowConfidenceFallbackFrames) {
            state.lowConfidenceFrames = 0;
            state.consecutiveCorrections = 0;
            const cue = createCue({
                state,
                cueState: 'retry-calm',
                message: 'Let us use a helper tone for a moment.',
                confidenceBand,
                domain: 'system',
                now,
                priority: 3,
                fallback: true,
            });
            state.lastCueAt = now;
            state.lastCueState = cue.state;
            return cue;
        }
        if (shouldRespectCooldown(state, now)) return null;
        const cue = createCue({
            state,
            cueState: 'listening',
            message: 'Listening for your sound...',
            confidenceBand,
            domain: 'system',
            now,
            priority: 1,
        });
        state.lastCueAt = now;
        state.lastCueState = cue.state;
        return cue;
    }

    state.lowConfidenceFrames = 0;

    if (shouldRespectCooldown(state, now)) return null;

    if (
        (Math.abs(pitchCents) > bounds.pitchToleranceCents || Math.abs(rhythmOffsetMs) > bounds.rhythmToleranceMs)
        && state.consecutiveCorrections >= HARD_RAILS.maxConsecutiveCorrections
    ) {
        state.consecutiveCorrections = 0;
        const cue = createCue({
            state,
            cueState: 'retry-calm',
            message: 'Tiny reset. One slow bow, then try again.',
            confidenceBand,
            domain: 'system',
            now,
            priority: 3,
        });
        state.lastCueAt = now;
        state.lastCueState = cue.state;
        return cue;
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
        state.lastCueAt = now;
        state.lastCueState = cue.state;
        return cue;
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
        state.lastCueAt = now;
        state.lastCueState = cue.state;
        return cue;
    }

    state.consecutiveCorrections = 0;
    const calmCueState = frustration >= bounds.frustrationLimit ? 'retry-calm' : 'steady';
    const cue = createCue({
        state,
        cueState: calmCueState,
        message: calmCueState === 'steady' ? 'Nice and steady.' : 'Great effort. One calm try.',
        confidenceBand,
        domain: 'system',
        now,
        priority: 1,
    });
    state.lastCueAt = now;
    state.lastCueState = cue.state;
    return cue;
};

export const getBoundsForPreset = (preset) => ({ ...getBounds(preset) });
