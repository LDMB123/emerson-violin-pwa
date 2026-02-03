import initCore, { GameTimer } from '@core/wasm/panda_core.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

let initPromise = null;

const ensureCore = () => {
    if (initPromise) return initPromise;
    initPromise = initCore().catch((error) => {
        initPromise = null;
        throw error;
    });
    return initPromise;
};

const computeTimingScore = (timer, timestamp) => {
    const beat = timer.get_beat(timestamp);
    const targetBeat = Math.round(beat);
    const diffBeats = Math.abs(beat - targetBeat);
    const diffMs = diffBeats * timer.ms_per_beat;
    const timingScore = clamp(1 - diffMs / timer.ms_per_beat, 0, 1);
    return { timingScore, targetBeat };
};

const scoreToRating = (score, timingScore) => {
    if (score === 2) {
        return { label: 'Perfect', level: 'perfect', timingScore: Math.max(timingScore, 0.9) };
    }
    if (score === 1) {
        const isGreat = timingScore >= 0.75;
        return { label: isGreat ? 'Great' : 'Good', level: isGreat ? 'great' : 'good', timingScore };
    }
    return { label: 'Off', level: 'off', timingScore };
};

export const createRhythmTimer = async (bpm = 90) => {
    try {
        await ensureCore();
    } catch {
        return null;
    }
    if (typeof GameTimer !== 'function') return null;
    let timer = null;
    try {
        timer = new GameTimer(Number(bpm) || 90);
    } catch {
        return null;
    }
    return {
        start: (timestamp) => timer.start(timestamp),
        setBpm: (nextBpm) => timer.set_bpm(Number(nextBpm) || bpm),
        scoreTap: (timestamp) => {
            const { timingScore, targetBeat } = computeTimingScore(timer, timestamp);
            const score = timer.score_tap(timestamp, targetBeat);
            return scoreToRating(score, timingScore);
        },
    };
};
