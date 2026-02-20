import { clamp } from '../utils/math.js';

export const formatTuningProgressMessage = ({
    note,
    tunedCount,
    targetStrings,
}) => {
    const remaining = Math.max(0, targetStrings - tunedCount);
    if (!remaining) return 'All target strings tuned. Great job!';
    return `Tuning ${note} · ${remaining} more string${remaining === 1 ? '' : 's'} to go.`;
};

export const setTuningStatusText = (statusEl, message) => {
    if (statusEl) statusEl.textContent = message;
};

export const renderTuningProgress = ({
    progressEl,
    progressBar,
    tunedCount,
    targetStrings,
}) => {
    if (!progressEl) return;
    const percent = clamp((tunedCount / targetStrings) * 100, 0, 100);
    progressEl.style.width = `${percent}%`;
    if (progressBar) progressBar.setAttribute('aria-valuenow', Math.round(percent));
};
