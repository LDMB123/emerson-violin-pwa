export const isSoundEnabled = () => document.documentElement.dataset.sounds !== 'off';

export const isSoundDisabledEvent = (event) => event?.detail?.enabled === false;
