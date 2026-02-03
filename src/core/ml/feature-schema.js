export const ML_FEATURE_SCHEMA_VERSION = 1;
export const ML_FEATURE_SAMPLE_MS = 100;
export const ML_FEATURE_WINDOW_MS = 1000;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const ML_FEATURE_RANGES = {
    pitchHz: [100, 2000],
    centsOffset: [-50, 50],
    centsError: [0, 50],
    rms: [0, 1],
    signalToNoise: [0, 60],
    spectralCentroidHz: [100, 4000],
    spectralRolloffHz: [500, 8000],
    zeroCrossingRate: [0, 0.5],
    attackMs: [0, 200],
    sustainMs: [0, 2000],
    vibratoRateHz: [0, 12],
    vibratoExtentCents: [0, 80],
    tempoBpm: [40, 200],
    onsetRate: [0, 10],
    timingJitterMs: [0, 200],
};

export const ML_FEATURE_DEFAULTS = {
    timestamp: 0,
    source: 'unknown',
    sessionId: 'unknown',
    sampleMs: ML_FEATURE_SAMPLE_MS,
    windowMs: ML_FEATURE_WINDOW_MS,
    bpmTarget: null,
    pitchHz: null,
    centsOffset: null,
    centsError: null,
    rms: null,
    signalToNoise: null,
    spectralCentroidHz: null,
    spectralRolloffHz: null,
    zeroCrossingRate: null,
    attackMs: null,
    sustainMs: null,
    vibratoRateHz: null,
    vibratoExtentCents: null,
    tempoBpm: null,
    onsetRate: null,
    timingJitterMs: null,
};

export const createFeatureFrame = (partial = {}) => {
    const next = { ...ML_FEATURE_DEFAULTS, ...(partial || {}) };
    next.timestamp = Number.isFinite(next.timestamp) ? next.timestamp : Date.now();
    if (Number.isFinite(next.centsOffset) && !Number.isFinite(next.centsError)) {
        next.centsError = Math.abs(next.centsOffset);
    }
    return next;
};

export const normalizeFeatureFrame = (frame = {}) => {
    const normalized = {};
    Object.keys(ML_FEATURE_RANGES).forEach((key) => {
        const value = Number.isFinite(frame[key]) ? frame[key] : null;
        if (value === null) {
            normalized[key] = null;
            return;
        }
        const [min, max] = ML_FEATURE_RANGES[key];
        normalized[key] = clamp((value - min) / (max - min));
    });
    return normalized;
};
