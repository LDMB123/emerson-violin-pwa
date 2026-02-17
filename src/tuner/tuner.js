import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { processTunerMessage } from './tuner-utils.js';
import { ML_UPDATE, ML_RESET } from '../utils/event-names.js';
import { setDifficultyBadge } from '../games/shared.js';

const livePanel = document.querySelector('#tuner-live');
const startButton = document.querySelector('#tuner-start');
const stopButton = document.querySelector('#tuner-stop');
const noteEl = document.querySelector('#tuner-note');
const centsEl = document.querySelector('#tuner-cents');
const freqEl = document.querySelector('#tuner-frequency');
const statusEl = document.querySelector('#tuner-status');
const toneButtons = Array.from(document.querySelectorAll('[data-tone]'));
const toneSamples = new Map(
    Array.from(document.querySelectorAll('[data-tone-audio]')).map((audio) => [audio.dataset.toneAudio, audio])
);

let audioContext = null;
let workletNode = null;
let micStream = null;
let silenceGain = null;
let tolerance = 8;
let inTuneCount = 0;
let detectCount = 0;
let startToken = 0;
let starting = false;

const isTunerView = () => window.location.hash === '#view-tuner';

const applyTuning = async () => {
    const tuning = await getGameTuning('tuner');
    tolerance = tuning.tolerance ?? tolerance;
    setDifficultyBadge(livePanel?.querySelector('.tuner-card-header'), tuning.difficulty);
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
    if (stopButton) stopButton.disabled = true;
    if (livePanel) livePanel.classList.remove('is-active');
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
    if (!startButton || !stopButton || !livePanel) return;
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

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            throw new Error('AudioContext not supported');
        }
        audioContext = new AudioCtx({ latencyHint: 'interactive' });
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

            noteEl.textContent = result.note;
            centsEl.textContent = result.centsLabel;
            freqEl.textContent = result.freqLabel;

            livePanel.style.setProperty('--tuner-offset', result.offset.toString());
            livePanel.classList.toggle('in-tune', result.inTune);
            detectCount += 1;
            if (result.inTune) inTuneCount += 1;
            setStatus(result.status);
        };

        setStatus(`Listening… play a note (±${tolerance}¢).`);
    } catch (error) {
        console.error('[Tuner] Unable to start microphone', error);
        await stopTuner();
        setStatus('Microphone permission denied or unavailable.');
    } finally {
        if (token === startToken) starting = false;
    }
};

if (startButton && stopButton) {
    applyTuning();
    startButton.addEventListener('click', startTuner);
    stopButton.addEventListener('click', stopTuner);

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
}

document.addEventListener(ML_UPDATE, (event) => {
    if (event.detail?.id === 'tuner') {
        applyTuning();
    }
});

document.addEventListener(ML_RESET, () => {
    applyTuning();
});

const playToneSample = (tone) => {
    const sample = toneSamples.get(tone);
    if (!sample) return;
    if (!isSoundEnabled()) {
        setStatus('Sounds are off. Turn on Sounds to hear this tone.');
        return;
    }
    // Stop any currently playing reference tones
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

if (toneButtons.length) {
    toneButtons.forEach((button) => {
        button.addEventListener('click', () => {
            playToneSample(button.dataset.tone);
        });
    });
}

// Custom reference tone play buttons
const refToneButtons = Array.from(document.querySelectorAll('[data-ref-tone]'));
refToneButtons.forEach((button) => {
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
