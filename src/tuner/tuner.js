import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import {
    RT_STATE,
    ML_UPDATE,
    ML_RESET,
} from '../utils/event-names.js';
import { setDifficultyBadge } from '../games/shared.js';
import {
    startSession,
    stopSession,
    getSessionState,
    init as initSessionController,
} from '../realtime/session-controller.js';

let livePanel = null;
let startButton = null;
let stopButton = null;
let noteEl = null;
let centsEl = null;
let freqEl = null;
let statusEl = null;
let toneButtons = [];
let toneSamples = new Map();
let refToneButtons = [];

let tolerance = 8;
let inTuneCount = 0;
let detectCount = 0;
let globalListenersBound = false;

const isTunerView = () => window.location.hash === '#view-tuner';

const resolveElements = () => {
    livePanel = document.querySelector('#tuner-live');
    startButton = document.querySelector('#tuner-start');
    stopButton = document.querySelector('#tuner-stop');
    noteEl = document.querySelector('#tuner-note');
    centsEl = document.querySelector('#tuner-cents');
    freqEl = document.querySelector('#tuner-frequency');
    statusEl = document.querySelector('#tuner-status');

    toneButtons = Array.from(document.querySelectorAll('[data-tone]'));
    toneSamples = new Map(
        Array.from(document.querySelectorAll('[data-tone-audio]')).map((audio) => [audio.dataset.toneAudio, audio]),
    );
    refToneButtons = Array.from(document.querySelectorAll('[data-ref-tone]'));

    return Boolean(livePanel && startButton && stopButton);
};

const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
};

const resetDisplay = () => {
    if (noteEl) noteEl.textContent = '--';
    if (centsEl) centsEl.textContent = '±0 cents';
    if (freqEl) freqEl.textContent = '0 Hz';
    if (livePanel) livePanel.classList.remove('in-tune');
    if (livePanel) livePanel.style.setProperty('--tuner-offset', '0');
};

const applyFrame = (frame) => {
    if (!frame || !frame.hasSignal) {
        resetDisplay();
        setStatus(`Listening… play a note (±${tolerance}¢).`);
        return;
    }

    const cents = Number.isFinite(frame.cents) ? Math.round(frame.cents) : 0;
    const frequency = Number.isFinite(frame.frequency) ? Math.round(frame.frequency * 10) / 10 : 0;
    const inTune = Math.abs(cents) <= tolerance;

    if (noteEl) noteEl.textContent = frame.note || '--';
    if (centsEl) centsEl.textContent = `${cents > 0 ? '+' : ''}${cents} cents`;
    if (freqEl) freqEl.textContent = `${frequency} Hz`;
    if (livePanel) {
        livePanel.style.setProperty('--tuner-offset', String(Math.max(-50, Math.min(50, cents))));
        livePanel.classList.toggle('in-tune', inTune);
    }

    detectCount += 1;
    if (inTune) inTuneCount += 1;

    setStatus(inTune ? `In tune (±${tolerance}¢) ✨` : 'Adjust to center.');
};

const updateControlState = (active) => {
    if (startButton) {
        startButton.disabled = Boolean(active);
        startButton.setAttribute('aria-pressed', active ? 'true' : 'false');
        startButton.textContent = active ? 'Listening' : 'Start Listening';
    }
    if (stopButton) stopButton.disabled = !active;
    if (livePanel) livePanel.classList.toggle('is-active', Boolean(active));
};

const startTuner = async () => {
    if (!resolveElements()) return;
    inTuneCount = 0;
    detectCount = 0;
    setStatus('Starting microphone…');
    const session = await startSession();
    updateControlState(session.active && !session.paused);
    if (!session.active) {
        setStatus('Microphone unavailable. Try helper tones below.');
    }
};

const stopTuner = async () => {
    await stopSession('tuner-stop');
    updateControlState(false);
    resetDisplay();
    setStatus(`Tap Start Listening (±${tolerance}¢).`);

    if (detectCount > 0) {
        const accuracy = (inTuneCount / detectCount) * 100;
        await updateGameResult('tuner', { accuracy, score: Math.round(accuracy) });
    }
    inTuneCount = 0;
    detectCount = 0;
};

const playToneSample = (tone) => {
    const sample = toneSamples.get(tone);
    if (!sample) return;

    if (!isSoundEnabled()) {
        setStatus('Sounds are off. Turn on Sounds to hear this tone.');
        return;
    }

    toneSamples.forEach((audio) => {
        if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
        audio.closest('.audio-card')?.classList.remove('is-playing');
    });

    const card = sample.closest('.audio-card');
    sample.currentTime = 0;
    sample.play().catch(() => {});
    card?.classList.add('is-playing');
    sample.onended = () => card?.classList.remove('is-playing');
};

const bindToneButtons = () => {
    toneButtons.forEach((button) => {
        if (button.dataset.tunerToneBound === 'true') return;
        button.dataset.tunerToneBound = 'true';
        button.addEventListener('click', () => {
            playToneSample(button.dataset.tone);
        });
    });

    refToneButtons.forEach((button) => {
        if (button.dataset.tunerRefBound === 'true') return;
        button.dataset.tunerRefBound = 'true';
        button.addEventListener('click', () => {
            const tone = button.dataset.refTone;
            const card = button.closest('.audio-card');
            const sample = toneSamples.get(tone);

            if (sample && !sample.paused) {
                sample.pause();
                sample.currentTime = 0;
                card?.classList.remove('is-playing');
                return;
            }

            playToneSample(tone);
        });
    });
};

const bindLocalListeners = () => {
    if (!startButton || !stopButton) return;
    if (startButton.dataset.tunerBound !== 'true') {
        startButton.dataset.tunerBound = 'true';
        startButton.addEventListener('click', startTuner);
    }
    if (stopButton.dataset.tunerBound !== 'true') {
        stopButton.dataset.tunerBound = 'true';
        stopButton.addEventListener('click', stopTuner);
    }
    bindToneButtons();
};

const applyTuning = async () => {
    const tuning = await getGameTuning('tuner');
    tolerance = tuning.tolerance ?? tolerance;
    setDifficultyBadge(document.querySelector('#tuner-live .tuner-card-header'), tuning.difficulty);
    setStatus(`Tap Start Listening (±${tolerance}¢).`);
};

const bindGlobalListeners = () => {
    if (globalListenersBound) return;
    globalListenersBound = true;

    window.addEventListener('hashchange', () => {
        if (!isTunerView()) return;
        const session = getSessionState();
        const active = Boolean(session.active) && !session.paused;
        updateControlState(active);
        applyFrame(session.lastFeature);
        if (!active) {
            setStatus(`Tap Start Listening (±${tolerance}¢).`);
        }
    }, { passive: true });

    document.addEventListener(RT_STATE, (event) => {
        if (!isTunerView()) return;
        const detail = event.detail || {};
        const listening = Boolean(detail.listening) && !detail.paused;
        updateControlState(listening);
        applyFrame(detail.lastFeature);
    });

    document.addEventListener(ML_UPDATE, (event) => {
        if (event.detail?.id === 'tuner') {
            resolveElements();
            applyTuning();
        }
    });

    document.addEventListener(ML_RESET, () => {
        resolveElements();
        applyTuning();
    });
};

const initTuner = () => {
    initSessionController();
    resolveElements();
    bindGlobalListeners();
    if (!startButton || !stopButton) return;
    bindLocalListeners();
    const session = getSessionState();
    const active = Boolean(session.active) && !session.paused;
    updateControlState(active);
    if (session.lastFeature && active) {
        applyFrame(session.lastFeature);
    } else {
        resetDisplay();
        setStatus(`Tap Start Listening (±${tolerance}¢).`);
    }
    applyTuning();
};

export const init = initTuner;
