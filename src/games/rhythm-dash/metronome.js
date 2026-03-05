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
    let isActive = false;
    let pausedByVisibility = false;
    let visibilityListenerBound = false;

    const clearMetronomeInterval = () => {
        if (!metronomeId) return;
        clearInterval(metronomeId);
        metronomeId = null;
    };

    const bindVisibilityListener = () => {
        if (visibilityListenerBound) return;
        document.addEventListener('visibilitychange', handleVisibilityChange);
        visibilityListenerBound = true;
    };

    const unbindVisibilityListener = () => {
        if (!visibilityListenerBound) return;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        visibilityListenerBound = false;
    };

    const playLeadIn = (player) => {
        player.playNote('E', { duration: 0.1, volume: 0.2, type: 'square' }).catch(() => {});
        metronomeBeat = 1;
    };

    const startMetronomeInterval = ({ playLead = false } = {}) => {
        if (metronomeId) return true;
        if (!isEnabled()) return false;
        const player = getPlayer();
        if (!player) return false;
        const interval = Math.max(240, getBeatInterval());
        metronomeId = window.setInterval(() => {
            const note = getMetronomeNote(metronomeBeat);
            const volume = getMetronomeVolume(metronomeBeat);
            player.playNote(note, { duration: 0.08, volume, type: 'square' }).catch(() => {});
            metronomeBeat += 1;
        }, interval);
        if (playLead) {
            playLeadIn(player);
        }
        return true;
    };

    function handleVisibilityChange() {
        if (!isActive) return;
        if (document.visibilityState === 'hidden') {
            if (!metronomeId) return;
            pausedByVisibility = true;
            clearMetronomeInterval();
            return;
        }
        if (!pausedByVisibility) return;
        pausedByVisibility = false;
        startMetronomeInterval();
    }

    const stop = () => {
        isActive = false;
        pausedByVisibility = false;
        clearMetronomeInterval();
        unbindVisibilityListener();
        metronomeBeat = 0;
    };

    const start = () => {
        stop();
        isActive = true;
        bindVisibilityListener();
        if (document.visibilityState === 'hidden') {
            pausedByVisibility = true;
            return;
        }
        if (!startMetronomeInterval({ playLead: true })) {
            stop();
        }
    };

    return { start, stop };
};
