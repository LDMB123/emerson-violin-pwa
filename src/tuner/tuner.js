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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isTunerView = () => window.location.hash === '#view-tuner';
const isSoundEnabled = () => document.documentElement?.dataset?.sounds !== 'off';

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
    setStatus('Tap Start to use the mic.');
};

const startTuner = async () => {
    if (!startButton || !stopButton || !livePanel) return;

    if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Microphone access is not available on this device.');
        return;
    }

    startButton.disabled = true;
    startButton.setAttribute('aria-pressed', 'true');
    stopButton.disabled = false;
    livePanel.classList.add('is-active');
    setStatus('Requesting microphone access…');

    try {
        micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
            },
        });

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            throw new Error('AudioContext not supported');
        }
        audioContext = new AudioCtx({ latencyHint: 'interactive' });
        if (!audioContext.audioWorklet) {
            throw new Error('AudioWorklet not supported');
        }
        await audioContext.audioWorklet.addModule('./src/worklets/tuner-processor.js');

        const source = audioContext.createMediaStreamSource(micStream);
        workletNode = new AudioWorkletNode(audioContext, 'tuner-processor');
        silenceGain = audioContext.createGain();
        silenceGain.gain.value = 0;

        source.connect(workletNode).connect(silenceGain).connect(audioContext.destination);
        await audioContext.resume();

        workletNode.port.onmessage = (event) => {
            const { frequency, note, cents, volume, inTune, error, ready } = event.data;

            if (error) {
                setStatus('Live tuner unavailable on this device.');
                return;
            }

            if (ready) {
                setStatus('Listening… play a note.');
                return;
            }

            if (!frequency || volume < 0.01) {
                resetDisplay();
                setStatus('Listening… play a note.');
                return;
            }

            const roundedFreq = Math.round(frequency * 10) / 10;
            const roundedCents = Math.round(cents);
            noteEl.textContent = note || '--';
            centsEl.textContent = `${roundedCents > 0 ? '+' : ''}${roundedCents} cents`;
            freqEl.textContent = `${roundedFreq} Hz`;

            const offset = clamp(roundedCents, -50, 50);
            livePanel.style.setProperty('--tuner-offset', offset.toString());
            livePanel.classList.toggle('in-tune', Boolean(inTune));
            setStatus(inTune ? 'In tune ✨' : 'Adjust to center');
        };

        setStatus('Listening… play a note.');
    } catch (error) {
        console.error('[Tuner] Unable to start microphone', error);
        await stopTuner();
        setStatus('Microphone permission denied or unavailable.');
    }
};

if (startButton && stopButton) {
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

if (toneButtons.length) {
    toneButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const tone = button.dataset.tone;
            const sample = toneSamples.get(tone);
            if (!sample) return;
            if (!isSoundEnabled()) {
                setStatus('Sounds are off. Turn on Sounds to hear this tone.');
                return;
            }
            sample.currentTime = 0;
            sample.play().catch(() => {});
        });
    });
}
