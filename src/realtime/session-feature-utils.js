import { finiteOrNow, finiteOrZero } from '../utils/math.js';

/**
 * Normalizes and clones a realtime feature frame for downstream session processing.
 */
export const cloneFeature = (feature) => {
    if (!feature || typeof feature !== 'object') return null;
    return {
        frequency: finiteOrZero(feature.frequency),
        note: feature.note || '--',
        cents: finiteOrZero(feature.cents),
        tempoBpm: finiteOrZero(feature.tempoBpm),
        confidence: finiteOrZero(feature.confidence),
        rhythmOffsetMs: finiteOrZero(feature.rhythmOffsetMs),
        onset: Boolean(feature.onset),
        hasSignal: Boolean(feature.hasSignal),
        timestamp: finiteOrNow(feature.timestamp),
    };
};
