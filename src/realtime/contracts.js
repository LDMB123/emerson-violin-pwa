import {
    RT_SESSION_STARTED,
    RT_SESSION_STOPPED,
    RT_CUE,
    RT_STATE,
    RT_FALLBACK,
    RT_PARENT_OVERRIDE,
    RT_QUALITY,
} from '../utils/event-names.js';

export const CONFIDENCE_BANDS = Object.freeze(['low', 'medium', 'high']);

export const CUE_STATES = Object.freeze([
    'listening',
    'steady',
    'adjust-up',
    'adjust-down',
    'retry-calm',
    'celebrate-lock',
]);

export const PARENT_PRESETS = Object.freeze(['gentle', 'standard', 'challenge']);

const REALTIME_EVENTS = Object.freeze([
    RT_SESSION_STARTED,
    RT_SESSION_STOPPED,
    RT_CUE,
    RT_STATE,
    RT_FALLBACK,
    RT_PARENT_OVERRIDE,
    RT_QUALITY,
]);

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isString = (value) => typeof value === 'string' && value.trim().length > 0;
const isBoolean = (value) => typeof value === 'boolean';
const inEnum = (value, list) => list.includes(value);
const pushError = (errors, condition, message) => {
    if (!condition) errors.push(message);
};

const validateSessionStarted = (payload, errors) => {
    pushError(errors, isString(payload.sessionId), 'sessionId must be a non-empty string');
    pushError(errors, isFiniteNumber(payload.startedAt), 'startedAt must be a finite number');
    pushError(errors, isString(payload.sourceView), 'sourceView must be a non-empty string');
};

const validateSessionStopped = (payload, errors) => {
    pushError(errors, isString(payload.sessionId), 'sessionId must be a non-empty string');
    pushError(errors, isFiniteNumber(payload.stoppedAt), 'stoppedAt must be a finite number');
    pushError(errors, isString(payload.reason), 'reason must be a non-empty string');
};

const validateCue = (payload, errors) => {
    pushError(errors, isString(payload.id), 'id must be a non-empty string');
    pushError(errors, inEnum(payload.state, CUE_STATES), `state must be one of: ${CUE_STATES.join(', ')}`);
    pushError(errors, isString(payload.message), 'message must be a non-empty string');
    pushError(
        errors,
        inEnum(payload.confidenceBand, CONFIDENCE_BANDS),
        `confidenceBand must be one of: ${CONFIDENCE_BANDS.join(', ')}`,
    );
    pushError(errors, isFiniteNumber(payload.priority), 'priority must be a finite number');
    pushError(errors, isFiniteNumber(payload.dwellMs), 'dwellMs must be a finite number');
    pushError(errors, isString(payload.domain), 'domain must be a non-empty string');
    pushError(errors, isBoolean(payload.urgent), 'urgent must be a boolean');
    pushError(errors, isBoolean(payload.fallback), 'fallback must be a boolean');
    if ('issuedAt' in payload) {
        pushError(errors, isFiniteNumber(payload.issuedAt), 'issuedAt must be a finite number');
    }
};

const validateState = (payload, errors) => {
    pushError(errors, isString(payload.sessionId), 'sessionId must be a non-empty string');
    pushError(errors, isBoolean(payload.listening), 'listening must be a boolean');
    pushError(errors, isBoolean(payload.paused), 'paused must be a boolean');
    pushError(
        errors,
        inEnum(payload.confidenceBand, CONFIDENCE_BANDS),
        `confidenceBand must be one of: ${CONFIDENCE_BANDS.join(', ')}`,
    );
    pushError(
        errors,
        inEnum(payload.cueState, CUE_STATES),
        `cueState must be one of: ${CUE_STATES.join(', ')}`,
    );
    pushError(errors, isFiniteNumber(payload.timestamp), 'timestamp must be a finite number');

    if ('viewId' in payload) {
        pushError(errors, isString(payload.viewId), 'viewId must be a non-empty string');
    }

    if ('lastFeature' in payload) {
        const feature = payload.lastFeature;
        pushError(errors, isObject(feature), 'lastFeature must be an object');
        if (isObject(feature)) {
            if ('frequency' in feature) pushError(errors, isFiniteNumber(feature.frequency), 'lastFeature.frequency must be a finite number');
            if ('note' in feature) pushError(errors, isString(feature.note), 'lastFeature.note must be a non-empty string');
            if ('cents' in feature) pushError(errors, isFiniteNumber(feature.cents), 'lastFeature.cents must be a finite number');
            if ('tempoBpm' in feature) pushError(errors, isFiniteNumber(feature.tempoBpm), 'lastFeature.tempoBpm must be a finite number');
            if ('confidence' in feature) pushError(errors, isFiniteNumber(feature.confidence), 'lastFeature.confidence must be a finite number');
        }
    }
};

const validateFallback = (payload, errors) => {
    pushError(errors, isString(payload.sessionId), 'sessionId must be a non-empty string');
    pushError(errors, isString(payload.reason), 'reason must be a non-empty string');
    pushError(errors, isString(payload.mode), 'mode must be a non-empty string');
    pushError(errors, isFiniteNumber(payload.at), 'at must be a finite number');
};

const validateParentOverride = (payload, errors) => {
    pushError(errors, inEnum(payload.preset, PARENT_PRESETS), `preset must be one of: ${PARENT_PRESETS.join(', ')}`);
    pushError(errors, inEnum(payload.previousPreset, PARENT_PRESETS), `previousPreset must be one of: ${PARENT_PRESETS.join(', ')}`);
    pushError(errors, isFiniteNumber(payload.at), 'at must be a finite number');
    pushError(errors, isString(payload.source), 'source must be a non-empty string');
};

const validateQuality = (payload, errors) => {
    pushError(errors, isString(payload.sessionId), 'sessionId must be a non-empty string');
    pushError(errors, isFiniteNumber(payload.p95CueLatencyMs), 'p95CueLatencyMs must be a finite number');
    pushError(errors, isFiniteNumber(payload.falseCorrectionRate), 'falseCorrectionRate must be a finite number');
    pushError(errors, isFiniteNumber(payload.fallbackRate), 'fallbackRate must be a finite number');
    pushError(errors, isFiniteNumber(payload.sampleCount), 'sampleCount must be a finite number');
    pushError(errors, isFiniteNumber(payload.at), 'at must be a finite number');
};

const EVENT_VALIDATORS = Object.freeze({
    [RT_SESSION_STARTED]: validateSessionStarted,
    [RT_SESSION_STOPPED]: validateSessionStopped,
    [RT_CUE]: validateCue,
    [RT_STATE]: validateState,
    [RT_FALLBACK]: validateFallback,
    [RT_PARENT_OVERRIDE]: validateParentOverride,
    [RT_QUALITY]: validateQuality,
});

export const isRealtimeEventName = (eventName) => REALTIME_EVENTS.includes(eventName);
export const isConfidenceBand = (value) => inEnum(value, CONFIDENCE_BANDS);
export const isCueState = (value) => inEnum(value, CUE_STATES);
export const isParentPreset = (value) => inEnum(value, PARENT_PRESETS);

export const confidenceBandFrom = (value) => {
    const score = isFiniteNumber(value) ? value : 0;
    if (score >= 0.75) return 'high';
    if (score >= 0.45) return 'medium';
    return 'low';
};

export const validateRealtimePayload = (eventName, payload) => {
    const errors = [];
    if (!isRealtimeEventName(eventName)) {
        errors.push(`Unknown realtime event: ${eventName}`);
        return { ok: false, errors };
    }
    if (!isObject(payload)) {
        errors.push('Payload must be an object');
        return { ok: false, errors };
    }
    const validator = EVENT_VALIDATORS[eventName];
    if (typeof validator === 'function') validator(payload, errors);
    return { ok: errors.length === 0, errors };
};

export const assertRealtimePayload = (eventName, payload) => {
    const result = validateRealtimePayload(eventName, payload);
    if (result.ok) return payload;
    throw new TypeError(`[RealtimeContracts] ${eventName} payload invalid: ${result.errors.join('; ')}`);
};

