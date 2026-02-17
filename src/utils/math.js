export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const todayDay = () => Math.floor(Date.now() / 86400000);
