const normalizeFrameMetrics = (frame) => ({
    cents: Number.isFinite(frame?.cents) ? Math.round(frame.cents) : 0,
    frequency: Number.isFinite(frame?.frequency) ? Math.round(frame.frequency * 10) / 10 : 0,
});

export const setStatus = (statusEl, text) => {
    if (statusEl) statusEl.textContent = text;
};

export const resetDisplay = ({ noteEl, centsEl, freqEl, livePanel }) => {
    if (noteEl) noteEl.textContent = '--';
    if (centsEl) centsEl.textContent = '±0 cents';
    if (freqEl) freqEl.textContent = '0 Hz';
    if (livePanel) livePanel.classList.remove('in-tune');
    if (livePanel) livePanel.style.setProperty('--tuner-offset', '0');
};

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
        viewRefs.livePanel.style.setProperty('--tuner-offset', String(Math.max(-50, Math.min(50, cents))));
        viewRefs.livePanel.classList.toggle('in-tune', inTune);
    }

    onDetection(inTune);
    setStatusText(inTune ? `In tune (±${tolerance}¢) ✨` : 'Adjust to center.');
};

export const frameRenderKey = (frame) => {
    if (!frame || !frame.hasSignal) return 'none';
    const { cents, frequency } = normalizeFrameMetrics(frame);
    return `${frame.note || '--'}|${cents}|${frequency}`;
};

export const realtimeRenderKey = (detail) => {
    const listening = Boolean(detail?.listening) && !detail?.paused ? '1' : '0';
    return `${listening}|${frameRenderKey(detail?.lastFeature)}`;
};

export const updateControlState = ({ startButton, stopButton, livePanel }, active) => {
    if (startButton) {
        startButton.disabled = Boolean(active);
        startButton.setAttribute('aria-pressed', active ? 'true' : 'false');
        startButton.textContent = active ? 'Listening' : 'Start Listening';
    }
    if (stopButton) stopButton.disabled = !active;
    if (livePanel) livePanel.classList.toggle('is-active', Boolean(active));
};
