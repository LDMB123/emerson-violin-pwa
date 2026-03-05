import { atLeast1, durationToMinutes, percentageRounded } from '../utils/math.js';
import { createIntervalTicker } from '../utils/interval-ticker.js';
import { toCountdownSeconds } from '../utils/countdown-utils.js';

export const formatMinutes = (value) => `${atLeast1(Math.round(value || 0))} min`;

const formatClockValue = (totalSeconds, { padMinutes = false } = {}) => {
    const minutes = durationToMinutes(totalSeconds);
    const seconds = totalSeconds % 60;
    const minutesLabel = padMinutes ? String(minutes).padStart(2, '0') : String(minutes);
    const secondsLabel = String(seconds).padStart(2, '0');
    return `${minutesLabel}:${secondsLabel}`;
};

export const formatTime = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    return formatClockValue(total, { padMinutes: true });
};

/** Countdown variant — uses Math.ceil so display never shows 0:00 prematurely. */
export const formatCountdown = (ms) => {
    const total = toCountdownSeconds(ms);
    return formatClockValue(total);
};

export const createSessionTimer = ({ targetMinutes, onUpdate, onMilestone }) => {
    let startedAt = null;
    const safeTargetMinutes = atLeast1(targetMinutes || 0);
    const targetMs = safeTargetMinutes * 60 * 1000;
    const halfMs = targetMs / 2;
    const oneMinMs = 60 * 1000;
    const announced = new Set();

    const elapsed = () => (startedAt ? Date.now() - startedAt : 0);

    const checkMilestones = (ms) => {
        if (!onMilestone) return;
        const remaining = targetMs - ms;
        if (ms >= targetMs && !announced.has('end')) {
            announced.add('end');
            onMilestone('end', 'Session complete');
        } else if (remaining > 0 && remaining <= oneMinMs && !announced.has('1min')) {
            announced.add('1min');
            onMilestone('1min', '1 minute remaining');
        } else if (ms >= halfMs && !announced.has('half')) {
            announced.add('half');
            onMilestone('half', 'Halfway there');
        }
    };

    const tick = () => {
        const ms = elapsed();
        const percent = Math.min(100, percentageRounded(ms, targetMs));
        const complete = ms >= targetMs;
        if (onUpdate) onUpdate({ ms, percent, complete, timeLabel: formatTime(ms) });
        checkMilestones(ms);
    };
    const ticker = createIntervalTicker({ onTick: tick, intervalMs: 1000 });

    const start = () => {
        if (ticker.isRunning()) return;
        startedAt = Date.now();
        announced.clear();
        tick();
        ticker.start();
    };

    const stop = () => {
        ticker.stop();
    };

    const reset = () => {
        stop();
        startedAt = null;
        announced.clear();
    };

    return { start, stop, reset, elapsed };
};
