export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const DAY_MS = 24 * 60 * 60 * 1000;
export const todayDay = () => Math.floor(Date.now() / DAY_MS);
export const dayFromTimestamp = (timestamp) => (Number.isFinite(timestamp) ? Math.floor(timestamp / DAY_MS) : 0);
export const deviationAccuracy = (actual, target) => clamp((1 - Math.abs(actual - target) / Math.max(target, 1)) * 100, 0, 100);
export const average = (values, fallback = 0) => {
    const usable = values.filter((value) => Number.isFinite(value));
    if (!usable.length) return fallback;
    return usable.reduce((sum, value) => sum + value, 0) / usable.length;
};

export const formatTimestamp = (value) => {
    if (!value) return '—';
    try { return new Date(value).toLocaleString(); } catch { return '—'; }
};

export const clampRounded = (value, min, max) => clamp(Math.round(value), min, max);
export const positiveRound = (value) => Math.max(0, Math.round(value));

export const durationToMinutes = (seconds, roundFn = Math.floor) => {
    const total = Math.max(0, seconds || 0);
    return roundFn(total / 60);
};

export const percentageRounded = (numerator, denominator, fallback = 0) => {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
        return fallback;
    }
    return Math.round((numerator / denominator) * 100);
};

export const finiteOrZero = (x) => (Number.isFinite(x) ? x : 0);
export const finiteOrNow = (x) => (Number.isFinite(x) ? x : Date.now());
export const atLeast1 = (x) => Math.max(1, x);
