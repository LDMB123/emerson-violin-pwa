import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { createAudioContext } from '../audio/audio-context.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { processTunerMessage } from './tuner-utils.js';
import { ML_UPDATE, ML_RESET } from '../utils/event-names.js';
import { setDifficultyBadge } from '../games/shared.js';

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

let audioContext = null;
let workletNode = null;
let micStream = null;
let silenceGain = null;
let tolerance = 8;
let inTuneCount = 0;
let detectCount = 0;
let startToken = 0;
let starting = false;
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
        Array.from(document.querySelectorAll('[data-tone-audio]')).map((audio) => [audio.dataset.toneAudio, audio])
    );
    refToneButtons = Array.from(document.querySelectorAll('[data-ref-tone]'));

    return Boolean(livePanel && startButton && stopButton);
};

const applyTuning = async () => {
    const tuning = await getGameTuning('tuner');
    tolerance = tuning.tolerance ?? tolerance;

    setDifficultyBadge(document.querySelector('#tuner-live .tuner-card-header'), tuning.difficulty);
    if (statusEl && !workletNode) {
        statusEl.textContent = `Tap the mic to start listening (±${tolerance}¢).`;
    }
    if (workletNode) {
        workletNode.port.postMessage({ type: 'tolerance', value: tolerance });
    }
};

const resetDisplay = () => {
    if (noteEl) noteEl.textContent = '--';
    if (centsEl) centsEl.textContent = '±0 cents';
    if (freqEl) freqEl.textContent = '0 Hz';
    if (livePanel) livePanel.classList.remove('in-tune');
    if (livePanel) livePanel.style.setProperty('--tuner-offset', '0');
};

const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
};

const stopTuner = async () => {
    startToken += 1;
    starting = false;

    if (workletNode) {
        workletNode.port.onmessage = null;
        workletNode.disconnect();
        workletNode = null;
    }

    if (silenceGain) {
        silenceGain.disconnect();
        silenceGain = null;
    }

    if (audioContext) {
        await audioContext.close();
        audioContext = null;
    }

    if (micStream) {
        micStream.getTracks().forEach((track) => track.stop());
        micStream = null;
    }

    if (startButton) {
        startButton.disabled = false;
        startButton.setAttribute('aria-pressed', 'false');
    }
    if (stopButton) {
        stopButton.disabled = true;
    }
    if (livePanel) {
        livePanel.classList.remove('is-active');
    }

    resetDisplay();
    setStatus(`Tap Start to use the mic (±${tolerance}¢).`);

    if (detectCount > 0) {
        const accuracy = (inTuneCount / detectCount) * 100;
        await updateGameResult('tuner', { accuracy, score: Math.round(accuracy) });
    }
    inTuneCount = 0;
    detectCount = 0;
};

const startTuner = async () => {
    if (!resolveElements()) return;
    if (starting || workletNode) return;

    const token = startToken + 1;
    startToken = token;
    starting = true;

    if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Microphone access is not available on this device.');
        starting = false;
        return;
    }

    startButton.disabled = true;
    startButton.setAttribute('aria-pressed', 'true');
    stopButton.disabled = false;
    livePanel.classList.add('is-active');
    setStatus('Requesting microphone access…');

    inTuneCount = 0;
    detectCount = 0;

    try {
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
            },
        });

        if (token !== startToken) {
            micStream.getTracks().forEach((track) => track.stop());
            return;
        }

        audioContext = createAudioContext({ latencyHint: 'interactive' });
        if (!audioContext) {
            throw new Error('AudioContext not supported');
        }
        if (!audioContext.audioWorklet) {
            throw new Error('AudioWorklet not supported');
        }

        await audioContext.audioWorklet.addModule(new URL('../worklets/tuner-processor.js', import.meta.url));
        if (token !== startToken) {
            await audioContext.close();
            audioContext = null;
            return;
        }

        const source = audioContext.createMediaStreamSource(micStream);
        workletNode = new AudioWorkletNode(audioContext, 'tuner-processor');
        silenceGain = audioContext.createGain();
        silenceGain.gain.value = 0;

        source.connect(workletNode).connect(silenceGain).connect(audioContext.destination);
        await audioContext.resume();

        if (token !== startToken) {
            await stopTuner();
            return;
        }

        workletNode.port.postMessage({ type: 'tolerance', value: tolerance });

        workletNode.port.onmessage = (event) => {
            const result = processTunerMessage(event.data, tolerance);
            if (!result) return;

            if (result.reset) {
                resetDisplay();
                setStatus(result.status);
                return;
            }

            if (!result.note) {
                setStatus(result.status);
                return;
            }

            if (noteEl) noteEl.textContent = result.note;
            if (centsEl) centsEl.textContent = result.centsLabel;
            if (freqEl) freqEl.textContent = result.freqLabel;

            if (livePanel) {
                livePanel.style.setProperty('--tuner-offset', result.offset.toString());
                livePanel.classList.toggle('in-tune', result.inTune);
            }

            detectCount += 1;
            if (result.inTune) {
                inTuneCount += 1;
            }
            setStatus(result.status);
        };

        setStatus(`Listening… play a note (±${tolerance}¢).`);
    } catch (error) {
        console.error('[Tuner] Unable to start microphone', error);
        await stopTuner();
        setStatus('Microphone permission denied or unavailable.');
    } finally {
        if (token === startToken) {
            starting = false;
        }
    }
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

const bindGlobalListeners = () => {
    if (globalListenersBound) return;
    globalListenersBound = true;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopTuner();
        }
    });

    window.addEventListener('pagehide', () => {
        stopTuner();
    });

    window.addEventListener('hashchange', () => {
        if (!isTunerView()) {
            stopTuner();
        }
    }, { passive: true });

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
    resolveElements();
    bindGlobalListeners();

    if (!startButton || !stopButton) return;

    bindLocalListeners();
    resetDisplay();
    setStatus(`Tap Start to use the mic (±${tolerance}¢).`);
    applyTuning();
};

export const init = initTuner;
