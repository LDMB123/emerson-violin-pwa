import { clamp } from '../utils/math.js';
import { setAriaPressed, setDisabled } from '../utils/dom-utils.js';

const normalizeFrameMetrics = (frame) => ({
    cents: Number.isFinite(frame?.cents) ? Math.round(frame.cents) : 0,
    frequency: Number.isFinite(frame?.frequency) ? Math.round(frame.frequency * 10) / 10 : 0,
});

/** Updates the tuner status line. */
export const setStatus = (statusEl, text) => {
    if (statusEl) statusEl.textContent = text;
};

/** Resets the tuner note, cents, frequency, and live-panel state to idle. */
export const resetDisplay = ({ noteEl, centsEl, freqEl, livePanel }) => {
    if (noteEl) noteEl.textContent = '--';
    if (centsEl) centsEl.textContent = '±0 cents';
    if (freqEl) freqEl.textContent = '0 Hz';
    if (livePanel) livePanel.classList.remove('in-tune');
    if (livePanel) livePanel.style.setProperty('--tuner-offset', '0');
};

/** Applies one tuner detection frame to the view and emits tune-state changes. */
export const applyFrame = ({
    frame,
    tolerance,
    viewRefs,
    listeningStatusText,
    setStatusText,
    onDetection,
}) => {
    if (!frame || !frame.hasSignal) {
        resetDisplay(viewRefs);
        setStatusText(listeningStatusText);
        return;
    }

    const { cents, frequency } = normalizeFrameMetrics(frame);
    const inTune = Math.abs(cents) <= tolerance;

    if (viewRefs.noteEl) viewRefs.noteEl.textContent = frame.note || '--';
    if (viewRefs.centsEl) viewRefs.centsEl.textContent = `${cents > 0 ? '+' : ''}${cents} cents`;
    if (viewRefs.freqEl) viewRefs.freqEl.textContent = `${frequency} Hz`;
    if (viewRefs.livePanel) {
        viewRefs.livePanel.style.setProperty('--tuner-offset', String(clamp(cents, -50, 50)));
        viewRefs.livePanel.classList.toggle('in-tune', inTune);
    }

    onDetection(inTune);
    setStatusText(inTune ? `In tune (±${tolerance}¢) ✨` : 'Adjust to center.');
};

const frameRenderKey = (frame) => {
    if (!frame || !frame.hasSignal) return 'none';
    const { cents, frequency } = normalizeFrameMetrics(frame);
    return `${frame.note || '--'}|${cents}|${frequency}`;
};

/** Returns a stable key for diffing tuner realtime render inputs. */
export const realtimeRenderKey = (detail) => {
    const listening = Boolean(detail?.listening) && !detail?.paused ? '1' : '0';
    return `${listening}|${frameRenderKey(detail?.lastFeature)}`;
};

/** Syncs tuner control button and panel state to the current listening mode. */
export const updateControlState = ({ startButton, stopButton, livePanel }, active) => {
    if (startButton) {
        startButton.disabled = Boolean(active);
        setAriaPressed(startButton, Boolean(active));
        startButton.textContent = active ? 'Listening' : 'Start Listening';
    }
    setDisabled(stopButton, !active);
    if (livePanel) livePanel.classList.toggle('is-active', Boolean(active));
};
