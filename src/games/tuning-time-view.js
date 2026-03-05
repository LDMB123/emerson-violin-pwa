import { clamp } from '../utils/math.js';
import { setTextContent } from '../utils/dom-utils.js';

export const formatTuningProgressMessage = ({
    note,
    tunedCount,
    targetStrings,
}) => {
    const remaining = Math.max(0, targetStrings - tunedCount);
    if (!remaining) return 'All target strings tuned. Great job!';
    return `Tuning ${note} · ${remaining} more string${remaining === 1 ? '' : 's'} to go.`;
};

export const setTuningStatusText = setTextContent;

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
