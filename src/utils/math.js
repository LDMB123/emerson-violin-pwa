export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const todayDay = () => Math.floor(Date.now() / 86400000);
export const formatTimestamp = (value) => {
    if (!value) return '—';
    try { return new Date(value).toLocaleString(); } catch { return '—'; }
};
