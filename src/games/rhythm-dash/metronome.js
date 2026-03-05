import {
    getMetronomeNote,
    getMetronomeVolume,
} from '../../utils/rhythm-dash-utils.js';
import { createVisibilityListener } from '../../utils/lifecycle-utils.js';
import { createIntervalTicker } from '../../utils/interval-ticker.js';

/** Creates the metronome controller used by Rhythm Dash practice loops. */
export const createRhythmDashMetronome = ({
    isEnabled,
    getPlayer,
    getBeatInterval,
} = {}) => {
    let metronomeTicker = null;
    let metronomeBeat = 0;
    let isActive = false;
    let pausedByVisibility = false;

    const isMetronomeRunning = () => Boolean(metronomeTicker?.isRunning?.());

    const clearMetronomeInterval = () => {
        if (!metronomeTicker) return;
        metronomeTicker.stop();
        metronomeTicker = null;
    };

    const playLeadIn = (player) => {
        player.playNote('E', { duration: 0.1, volume: 0.2, type: 'square' }).catch(() => {});
        metronomeBeat = 1;
    };

    const startMetronomeInterval = ({ playLead = false } = {}) => {
        if (isMetronomeRunning()) return true;
        if (!isEnabled()) return false;
        const player = getPlayer();
        if (!player) return false;
        const interval = Math.max(240, getBeatInterval());
        const playBeat = () => {
            const note = getMetronomeNote(metronomeBeat);
            const volume = getMetronomeVolume(metronomeBeat);
            player.playNote(note, { duration: 0.08, volume, type: 'square' }).catch(() => {});
            metronomeBeat += 1;
        };
        metronomeTicker = createIntervalTicker({
            onTick: playBeat,
            intervalMs: interval,
            setIntervalFn: window.setInterval,
            clearIntervalFn: window.clearInterval,
        });
        metronomeTicker.start();
        if (playLead) {
            playLeadIn(player);
        }
        return true;
    };

    function handleVisibilityChange() {
        if (!isActive) return;
        if (document.visibilityState === 'hidden') {
            if (!isMetronomeRunning()) return;
            pausedByVisibility = true;
            clearMetronomeInterval();
            return;
        }
        if (!pausedByVisibility) return;
        pausedByVisibility = false;
        startMetronomeInterval();
    }
    const visibilityListener = createVisibilityListener(handleVisibilityChange);

    const stop = () => {
        isActive = false;
        pausedByVisibility = false;
        clearMetronomeInterval();
        visibilityListener.unbind();
        metronomeBeat = 0;
    };

    const start = () => {
        stop();
        isActive = true;
        visibilityListener.bind();
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
