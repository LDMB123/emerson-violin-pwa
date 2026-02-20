export const cloneFeature = (feature) => {
    if (!feature || typeof feature !== 'object') return null;
    return {
        frequency: Number.isFinite(feature.frequency) ? feature.frequency : 0,
        note: feature.note || '--',
        cents: Number.isFinite(feature.cents) ? feature.cents : 0,
        tempoBpm: Number.isFinite(feature.tempoBpm) ? feature.tempoBpm : 0,
        confidence: Number.isFinite(feature.confidence) ? feature.confidence : 0,
        rhythmOffsetMs: Number.isFinite(feature.rhythmOffsetMs) ? feature.rhythmOffsetMs : 0,
        onset: Boolean(feature.onset),
        hasSignal: Boolean(feature.hasSignal),
        timestamp: Number.isFinite(feature.timestamp) ? feature.timestamp : Date.now(),
    };
};
