export const formatMinutes = (value) => `${Math.max(1, Math.round(value || 0))} min`;

export const formatTime = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const createSessionTimer = ({ targetMinutes, onUpdate, onMilestone }) => {
    let interval = null;
    let startedAt = null;
    const safeTargetMinutes = Math.max(1, targetMinutes || 0);
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
        const percent = Math.min(100, Math.round((ms / targetMs) * 100));
        const complete = ms >= targetMs;
        if (onUpdate) onUpdate({ ms, percent, complete, timeLabel: formatTime(ms) });
        checkMilestones(ms);
    };

    const start = () => {
        if (interval) return;
        startedAt = Date.now();
        announced.clear();
        tick();
        interval = setInterval(tick, 1000);
    };

    const stop = () => {
        if (!interval) return;
        clearInterval(interval);
        interval = null;
    };

    const reset = () => {
        stop();
        startedAt = null;
        announced.clear();
    };

    return { start, stop, reset, elapsed };
};
