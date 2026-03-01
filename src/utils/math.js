export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const todayDay = () => Math.floor(Date.now() / 86400000);
export const dayFromTimestamp = (timestamp) => (Number.isFinite(timestamp) ? Math.floor(timestamp / 86400000) : 0);
export const deviationAccuracy = (actual, target) => clamp((1 - Math.abs(actual - target) / Math.max(target, 1)) * 100, 0, 100);
export const formatTimestamp = (value) => {
    if (!value) return '—';
    try { return new Date(value).toLocaleString(); } catch { return '—'; }
};
