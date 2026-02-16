import { clamp } from '../utils/math.js';

export { clamp };

export const formatDifficulty = (value) => {
    const label = value || 'medium';
    return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * Process a message from the tuner AudioWorklet.
 * Returns a display-ready result object.
 */
export const processTunerMessage = (data, tolerance) => {
    const { frequency, note, cents, volume, inTune, error, ready } = data;

    if (error) {
        return { status: 'Live tuner unavailable on this device.', reset: false };
    }

    if (ready) {
        return { status: 'Listening\u2026 play a note.', reset: false };
    }

    if (!frequency || volume < 0.01) {
        return { status: `Listening\u2026 play a note (\u00b1${tolerance}\u00a2).`, reset: true };
    }

    const roundedFreq = Math.round(frequency * 10) / 10;
    const roundedCents = Math.round(cents);
    const offset = clamp(roundedCents, -50, 50);
    const centsLabel = `${roundedCents > 0 ? '+' : ''}${roundedCents} cents`;
    const freqLabel = `${roundedFreq} Hz`;
    const status = inTune ? `In tune (\u00b1${tolerance}\u00a2) \u2728` : 'Adjust to center';

    return {
        note: note || '--',
        cents: roundedCents,
        centsLabel,
        freq: roundedFreq,
        freqLabel,
        offset,
        inTune: Boolean(inTune),
        status,
        reset: false,
    };
};
