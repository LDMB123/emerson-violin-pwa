import {
    getMetronomeNote,
    getMetronomeVolume,
} from '../../utils/rhythm-dash-utils.js';

export const createRhythmDashMetronome = ({
    isEnabled,
    getPlayer,
    getBeatInterval,
} = {}) => {
    let metronomeId = null;
    let metronomeBeat = 0;

    const stop = () => {
        if (metronomeId) {
            clearInterval(metronomeId);
            metronomeId = null;
        }
        metronomeBeat = 0;
    };

    const start = () => {
        stop();
        if (!isEnabled()) return;
        const player = getPlayer();
        if (!player) return;
        const interval = Math.max(240, getBeatInterval());
        metronomeId = window.setInterval(() => {
            const note = getMetronomeNote(metronomeBeat);
            const volume = getMetronomeVolume(metronomeBeat);
            player.playNote(note, { duration: 0.08, volume, type: 'square' }).catch(() => {});
            metronomeBeat += 1;
        }, interval);
        player.playNote('E', { duration: 0.1, volume: 0.2, type: 'square' }).catch(() => {});
        metronomeBeat = 1;
    };

    return { start, stop };
};
