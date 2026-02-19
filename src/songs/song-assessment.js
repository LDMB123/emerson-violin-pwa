import { clamp } from '../utils/math.js';

const toScore = (value, fallback = 0) => {
    const score = Number(value);
    if (!Number.isFinite(score)) return fallback;
    return clamp(Math.round(score), 0, 100);
};

const starsFromScores = (timing, intonation, overall) => {
    const weighted = Math.round((timing * 0.45) + (intonation * 0.45) + (overall * 0.1));
    if (weighted >= 95) return 5;
    if (weighted >= 88) return 4;
    if (weighted >= 78) return 3;
    if (weighted >= 66) return 2;
    if (weighted >= 50) return 1;
    return 0;
};

const tierFromScore = (score) => {
    if (score >= 92) return 'gold';
    if (score >= 80) return 'silver';
    if (score >= 60) return 'bronze';
    return 'foundation';
};

export const assessSongAttempt = ({
    accuracy,
    timingAccuracy,
    intonationAccuracy,
    tempo,
    attemptType = 'full',
} = {}) => {
    const overall = toScore(accuracy, 0);
    const timing = toScore(timingAccuracy, overall);
    const intonation = toScore(intonationAccuracy, overall);

    const stars = starsFromScores(timing, intonation, overall);
    const tier = tierFromScore(Math.round((timing + intonation + overall) / 3));

    return {
        accuracy: overall,
        timingAccuracy: timing,
        intonationAccuracy: intonation,
        stars,
        tier,
        tempo: Number.isFinite(tempo) ? Math.max(30, Math.round(tempo)) : null,
        attemptType,
    };
};

export const aggregateSongAssessments = (events = []) => {
    const songMap = new Map();

    events
        .filter((event) => event?.type === 'song' && event?.id)
        .forEach((event) => {
            const existing = songMap.get(event.id) || {
                id: event.id,
                attempts: 0,
                bestAccuracy: 0,
                bestTiming: 0,
                bestIntonation: 0,
                bestStars: 0,
                latestTempo: null,
            };

            const accuracy = toScore(event.accuracy, 0);
            const timing = toScore(event.timingAccuracy, accuracy);
            const intonation = toScore(event.intonationAccuracy, accuracy);
            const stars = Number.isFinite(event.stars) ? clamp(Math.round(event.stars), 0, 5) : starsFromScores(timing, intonation, accuracy);

            existing.attempts += 1;
            existing.bestAccuracy = Math.max(existing.bestAccuracy, accuracy);
            existing.bestTiming = Math.max(existing.bestTiming, timing);
            existing.bestIntonation = Math.max(existing.bestIntonation, intonation);
            existing.bestStars = Math.max(existing.bestStars, stars);
            existing.latestTempo = Number.isFinite(event.tempo) ? Math.round(event.tempo) : existing.latestTempo;
            existing.tier = tierFromScore(Math.round((existing.bestAccuracy + existing.bestTiming + existing.bestIntonation) / 3));

            songMap.set(event.id, existing);
        });

    return Object.fromEntries(Array.from(songMap.entries()));
};
