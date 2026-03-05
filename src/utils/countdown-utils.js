export const COUNTDOWN_TICK_MS = 500;

export const toCountdownSeconds = (milliseconds) => Math.max(0, Math.ceil(milliseconds / 1000));

export const toRemainingCountdownSeconds = (endTime, now = Date.now()) => toCountdownSeconds(endTime - now);
