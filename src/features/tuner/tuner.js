import { getGameTuning, updateGameResult } from '@core/ml/adaptive-engine.js';
import { ensureDifficultyBadge } from '@core/utils/templates.js';
import { appendFeatureFrame } from '@core/ml/feature-store.js';
import { getViewId, onViewChange } from '@core/utils/view-events.js';

const livePanel = document.querySelector('#tuner-live');
const tunerToggle = document.querySelector('#tuner-active');
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
let featureSessionId = null;
let lastFeatureAt = 0;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isTunerView = () => getViewId() === 'view-tuner';
const isSoundEnabled = () => document.documentElement?.dataset?.sounds !== 'off';

const formatDifficulty = (value) => {
    const label = value || 'medium';
    return label.charAt(0).toUpperCase() + label.slice(1);
};

const ensureBadge = () => ensureDifficultyBadge(livePanel?.querySelector('.tuner-card-header'));

const applyTuning = async () => {
    const tuning = await getGameTuning('tuner');
    tolerance = tuning.tolerance ?? tolerance;
    const badge = ensureBadge();
    if (badge) {
        badge.dataset.level = tuning.difficulty || 'medium';
        badge.textContent = `Adaptive: ${formatDifficulty(tuning.difficulty)}`;
    }
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
    if (livePanel) delete livePanel.dataset.inTune;
    if (livePanel) livePanel.style.setProperty('--tuner-offset', '0');
};

const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
};

const stopTuner = async () => {
    startToken += 1;
    starting = false;
    featureSessionId = null;
    lastFeatureAt = 0;
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

    if (tunerToggle) tunerToggle.checked = false;
    resetDisplay();
    setStatus(`Tap the mic to use the tuner (±${tolerance}¢).`);
    if (detectCount > 0) {
        const accuracy = (inTuneCount / detectCount) * 100;
        await updateGameResult('tuner', { accuracy, score: Math.round(accuracy) });
    }
    inTuneCount = 0;
    detectCount = 0;
};

const startTuner = async () => {
    if (!tunerToggle || !livePanel) return;
    if (starting || workletNode) return;
    const token = startToken + 1;
    startToken = token;
    starting = true;

    if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Microphone access is not available on this device.');
        tunerToggle.checked = false;
        starting = false;
        return;
    }

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
        await audioContext.audioWorklet.addModule(new URL('../../core/worklets/tuner-processor.js', import.meta.url));
        if (token !== startToken) {
            await audioContext.close();
            audioContext = null;
            return;
        }

        const source = audioContext.createMediaStreamSource(micStream);
        workletNode = new AudioWorkletNode(audioContext, 'tuner-processor');
        silenceGain = audioContext.createGain();
        silenceGain.gain.value = 0;
        featureSessionId = `tuner-${Date.now()}`;
        lastFeatureAt = 0;

        source.connect(workletNode).connect(silenceGain).connect(audioContext.destination);
        await audioContext.resume();
        if (token !== startToken) {
            await stopTuner();
            return;
        }
        workletNode.port.postMessage({ type: 'tolerance', value: tolerance });

        workletNode.port.onmessage = (event) => {
            const {
                frequency,
                note,
                cents,
                volume,
                inTune,
                error,
                ready,
                processMs,
                bufferSize,
                sampleRate,
            } = event.data;

            if (Number.isFinite(processMs)) {
                document.dispatchEvent(new CustomEvent('panda:audio-perf', {
                    detail: {
                        processMs,
                        bufferSize,
                        sampleRate,
                    },
                }));
            }

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
                setStatus(`Listening… play a note (±${tolerance}¢).`);
                return;
            }

            const roundedFreq = Math.round(frequency * 10) / 10;
            const roundedCents = Math.round(cents);
            const now = Date.now();
            if (featureSessionId && now - lastFeatureAt >= 100) {
                lastFeatureAt = now;
                appendFeatureFrame({
                    source: 'tuner',
                    sessionId: featureSessionId,
                    pitchHz: roundedFreq,
                    centsOffset: roundedCents,
                    rms: volume,
                    sampleMs: 100,
                }).catch(() => {});
            }
            noteEl.textContent = note || '--';
            centsEl.textContent = `${roundedCents > 0 ? '+' : ''}${roundedCents} cents`;
            freqEl.textContent = `${roundedFreq} Hz`;

            const offset = clamp(roundedCents, -50, 50);
            livePanel.style.setProperty('--tuner-offset', offset.toString());
            if (inTune) {
                livePanel.dataset.inTune = 'true';
            } else {
                delete livePanel.dataset.inTune;
            }
            detectCount += 1;
            if (inTune) inTuneCount += 1;
            setStatus(inTune ? `In tune (±${tolerance}¢) ✨` : 'Adjust to center');
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

if (tunerToggle) {
    applyTuning();
    tunerToggle.addEventListener('change', () => {
        if (!tunerToggle.checked) {
            stopTuner();
            return;
        }
        startTuner();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopTuner();
        }
    });

    window.addEventListener('pagehide', () => {
        stopTuner();
    });

    onViewChange((viewId) => {
        if (viewId === 'view-tuner') return;
        stopTuner();
    });
}

document.addEventListener('panda:ml-update', (event) => {
    if (event.detail?.id === 'tuner') {
        applyTuning();
    }
});

document.addEventListener('panda:ml-reset', () => {
    applyTuning();
});

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
