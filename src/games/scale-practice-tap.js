import { clamp } from '../utils/math.js';

export const computeScalePracticeTapResult = ({
    interval,
    targetTempo,
    timingScores,
    score,
    scaleIndex,
    scaleNotes,
}) => {
    const ideal = 60000 / targetTempo;
    const deviation = Math.abs(interval - ideal);
    const timingScore = clamp(1 - deviation / ideal, 0, 1);
    const nextTimingScores = timingScores.concat(timingScore).slice(-15);

    let label = 'Off';
    if (timingScore >= 0.9) label = 'Perfect';
    else if (timingScore >= 0.75) label = 'Great';
    else if (timingScore >= 0.6) label = 'Good';

    const nextScore = score + Math.round(8 + timingScore * 12);
    const nextAccuracy = clamp(
        (nextTimingScores.reduce((sum, value) => sum + value, 0) / nextTimingScores.length) * 100,
        0,
        100,
    );

    let noteAction = null;
    let nextScaleIndex = scaleIndex;
    if (timingScore >= 0.75) {
        noteAction = {
            note: scaleNotes[scaleIndex % scaleNotes.length],
            options: { duration: 0.22, volume: 0.18, type: 'triangle' },
        };
        nextScaleIndex += 1;
    } else if (timingScore > 0) {
        noteAction = {
            note: 'F',
            options: { duration: 0.18, volume: 0.12, type: 'sawtooth' },
        };
    }

    return {
        timingScore,
        label,
        score: nextScore,
        timingScores: nextTimingScores,
        accuracy: nextAccuracy,
        scaleIndex: nextScaleIndex,
        noteAction,
        markStep1: timingScore >= 0.6,
        markStep2: timingScore >= 0.75,
        markStep4: timingScore >= 0.9,
        shouldReport: nextTimingScores.length >= 8,
    };
};
