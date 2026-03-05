export const getSongEventScore = (event, { includeLegacyScore = false } = {}) => {
    if (Number.isFinite(event?.accuracy)) return event.accuracy;
    if (Number.isFinite(event?.timingAccuracy)) return event.timingAccuracy;
    if (includeLegacyScore && Number.isFinite(event?.score)) return event.score;
    return 0;
};
