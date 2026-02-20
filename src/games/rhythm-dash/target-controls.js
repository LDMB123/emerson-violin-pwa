import { clamp } from '../../utils/math.js';
import { computeBeatInterval } from '../../utils/rhythm-dash-utils.js';

export const applyRhythmDashTargetBpm = ({
    value,
    fallbackTargetBpm,
    stage,
    targetSlider,
    targetValue,
    setStatus,
    runToggle,
    wasRunning,
    startMetronome,
    user = false,
}) => {
    const next = clamp(Number(value) || fallbackTargetBpm, 60, 140);
    const beatInterval = computeBeatInterval(next);
    stage.style.setProperty('--beat-interval', `${(60 / next).toFixed(2)}s`);
    stage.style.setProperty('--beat-cycle', `${(60 / next * 8).toFixed(2)}s`);
    if (targetSlider) {
        targetSlider.value = String(next);
        targetSlider.setAttribute('aria-valuenow', String(next));
        targetSlider.setAttribute('aria-valuetext', `${next} BPM`);
        if (user) targetSlider.dataset.userSet = 'true';
    }
    if (targetValue) targetValue.textContent = `${next} BPM`;
    if (!wasRunning) {
        setStatus(`Tap Start to begin. Target ${next} BPM.`);
    }
    if (runToggle?.checked) {
        startMetronome();
    }
    return { targetBpm: next, beatInterval };
};

export const bindRhythmDashTargetControls = ({
    targetSlider,
    settingsReset,
    applyTargetBpm,
    getCoachTarget,
    setStatus,
}) => {
    targetSlider?.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        applyTargetBpm(target.value, { user: true });
    });

    settingsReset?.addEventListener('click', () => {
        if (targetSlider) delete targetSlider.dataset.userSet;
        const coachTarget = getCoachTarget();
        applyTargetBpm(coachTarget);
        setStatus(`Target reset to ${coachTarget} BPM.`);
    });
};
