import { getGameTuning, updateGameResult } from '@core/ml/adaptive-engine.js';
import { ensureDifficultyBadge } from '@core/utils/templates.js';
import { appendFeatureFrame } from '@core/ml/feature-store.js';
import { onViewChange } from '@core/utils/view-events.js';
import initAudioWasm, { PitchDetector } from '@core/wasm/panda_audio.js';
import { createBudgetMonitor } from '@core/audio/audio-budget.js';

const livePanel = document.querySelector('#tuner-live');
const tunerToggle = document.querySelector('#tuner-active');
const noteEl = document.querySelector('#tuner-note');
const centsEl = document.querySelector('#tuner-cents');
const freqEl = document.querySelector('#tuner-frequency');
const statusEl = document.querySelector('#tuner-status');
const demoEl = document.querySelector('[data-tuner-demo]');
const directionEl = document.querySelector('[data-tuner-direction]');
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
let fallbackDetector = null;
let fallbackAnalyser = null;
let fallbackBuffer = null;
let fallbackTimer = null;
let fallbackActive = false;
let fallbackWasmReady = null;
let firstNoteSent = false;
let tunerStartAt = null;
const FALLBACK_BUFFER_SIZE = 2048;
const FALLBACK_INTERVAL = 80;
const STABILITY_THRESHOLD = 3;
const WORKLET_STALL_MS = 1600;
const BUDGET_RATIO = 0.9;
const MAX_BUDGET_BREACHES = 6;
let workletWatchdog = null;
let lastWorkletAt = 0;
const budgetMonitor = createBudgetMonitor({
    ratio: BUDGET_RATIO,
    maxBreaches: MAX_BUDGET_BREACHES,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isSoundEnabled = () => document.documentElement?.dataset?.sounds !== 'off';

const formatDifficulty = (value) => {
    const label = value || 'medium';
    return label.charAt(0).toUpperCase() + label.slice(1);
};

const ensureBadge = () => ensureDifficultyBadge(livePanel?.querySelector('.tuner-card-header'));
const formatCentsHint = (cents) => {
    if (!Number.isFinite(cents)) return 'Center it';
    if (Math.abs(cents) <= tolerance) return 'Perfect!';
    return cents > 0 ? 'Lower' : 'Higher';
};

const setTuneState = (state, label) => {
    if (livePanel) livePanel.dataset.tuneState = state;
    if (directionEl) directionEl.textContent = label;
};

const applyTuning = async () => {
    const tuning = await getGameTuning('tuner');
    tolerance = tuning.tolerance ?? tolerance;
    const badge = ensureBadge();
    if (badge) {
        badge.dataset.level = tuning.difficulty || 'medium';
        badge.textContent = `Adaptive: ${formatDifficulty(tuning.difficulty)}`;
    }
    if (statusEl && !workletNode) {
        statusEl.textContent = 'Tap the mic, then play a string.';
    }
    if (workletNode) {
        workletNode.port.postMessage({ type: 'tolerance', value: tolerance });
    }
    if (fallbackDetector?.set_tune_tolerance) {
        fallbackDetector.set_tune_tolerance(tolerance);
    }
};

const resetDisplay = () => {
    if (noteEl) noteEl.textContent = '--';
    if (centsEl) centsEl.textContent = '±0 cents';
    if (freqEl) freqEl.textContent = '0 Hz';
    if (demoEl) demoEl.textContent = 'Live input: --';
    if (livePanel) delete livePanel.dataset.inTune;
    setTuneState('silent', 'Tap the mic');
    if (livePanel) livePanel.style.setProperty('--tuner-offset', '0');
};

const setStatus = (text) => {
    if (statusEl) statusEl.textContent = text;
};

const ensureFallbackDetector = async (sampleRate) => {
    if (!PitchDetector) return null;
    if (!fallbackWasmReady) {
        fallbackWasmReady = initAudioWasm().catch(() => null);
    }
    await fallbackWasmReady;
    if (!fallbackWasmReady) return null;
    const detector = new PitchDetector(sampleRate, FALLBACK_BUFFER_SIZE);
    detector.set_tune_tolerance(tolerance);
    detector.set_volume_threshold(0.01);
    if (detector.set_stability_threshold) {
        detector.set_stability_threshold(STABILITY_THRESHOLD);
    }
    return detector;
};

const stopFallback = () => {
    fallbackActive = false;
    if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
    }
    if (fallbackAnalyser) {
        try {
            fallbackAnalyser.disconnect();
        } catch {}
        fallbackAnalyser = null;
    }
    fallbackDetector = null;
    fallbackBuffer = null;
};

const clearWorkletWatchdog = () => {
    if (workletWatchdog) {
        clearInterval(workletWatchdog);
        workletWatchdog = null;
    }
};

const resetBudgetBreaches = () => {
    budgetMonitor.reset();
};

const touchWorklet = () => {
    lastWorkletAt = Date.now();
};

const startWorkletWatchdog = () => {
    clearWorkletWatchdog();
    touchWorklet();
    workletWatchdog = window.setInterval(() => {
        if (!workletNode || fallbackActive || document.hidden) return;
        const idleFor = Date.now() - lastWorkletAt;
        if (idleFor < WORKLET_STALL_MS) return;
        setStatus('Audio worklet stalled. Switching to fallback…');
        if (workletNode) {
            workletNode.port.onmessage = null;
            workletNode.disconnect();
            workletNode = null;
        }
        clearWorkletWatchdog();
        startFallback(audioContext, micStream);
    }, WORKLET_STALL_MS);
};

const startFallback = async (context, stream) => {
    if (!context || !stream) return false;
    stopFallback();
    const detector = await ensureFallbackDetector(context.sampleRate);
    if (!detector) {
        setStatus('Fallback tuner unavailable on this device.');
        return false;
    }
    fallbackDetector = detector;
    fallbackAnalyser = context.createAnalyser();
    fallbackAnalyser.fftSize = FALLBACK_BUFFER_SIZE;
    fallbackBuffer = new Float32Array(fallbackAnalyser.fftSize);
    const source = context.createMediaStreamSource(stream);
    source.connect(fallbackAnalyser);
    fallbackActive = true;

    const tick = () => {
        if (!fallbackActive || !fallbackAnalyser || !fallbackBuffer || !fallbackDetector) return;
        fallbackAnalyser.getFloatTimeDomainData(fallbackBuffer);
        const result = fallbackDetector.detect(fallbackBuffer);
        handlePitchResult({
            frequency: result.frequency,
            note: result.note,
            cents: result.cents,
            volume: result.volume,
            inTune: result.in_tune,
            confidence: result.confidence,
            stableNote: result.stable_note,
            stableCents: result.stable_cents,
            stability: result.stability,
            fallback: true,
        });
        fallbackTimer = window.setTimeout(tick, FALLBACK_INTERVAL);
    };

    setStatus('Fallback tuner active. Play a note.');
    tick();
    return true;
};

const handlePitchResult = ({
    frequency,
    note,
    cents,
    volume,
    inTune,
    stableNote,
    stableCents,
    stability,
    fallback,
} = {}) => {
    if (!frequency || volume < 0.01) {
        resetDisplay();
        setTuneState('silent', 'Play a string');
        setStatus('Listening… play a string.');
        return;
    }

    if (!firstNoteSent && Number.isFinite(tunerStartAt)) {
        firstNoteSent = true;
        document.dispatchEvent(new CustomEvent('panda:tuner-first-note', {
            detail: {
                elapsedMs: performance.now() - tunerStartAt,
                fallback: Boolean(fallback),
            },
        }));
    }

    const roundedFreq = Math.round(frequency * 10) / 10;
    const roundedCents = Math.round(Number.isFinite(cents) ? cents : 0);
    const roundedStable = Number.isFinite(stableCents) ? Math.round(stableCents) : roundedCents;
    const displayNote = stableNote || note || '--';
    const displayCents = stableNote ? roundedStable : roundedCents;
    const now = Date.now();
    if (featureSessionId && now - lastFeatureAt >= 100) {
        lastFeatureAt = now;
        appendFeatureFrame({
            source: 'tuner',
            sessionId: featureSessionId,
            pitchHz: roundedFreq,
            centsOffset: displayCents,
            rms: volume,
            sampleMs: 100,
        }).catch(() => {});
    }
    noteEl.textContent = displayNote || '--';
    const centsLabel = `${displayCents > 0 ? '+' : ''}${displayCents}¢`;
    centsEl.textContent = `${formatCentsHint(displayCents)} · ${centsLabel}`;
    freqEl.textContent = `${roundedFreq} Hz`;
    if (demoEl) {
        demoEl.textContent = `Live input: ${displayNote || '--'} · ${roundedFreq} Hz`;
    }

    const offset = clamp(displayCents, -50, 50);
    livePanel.style.setProperty('--tuner-offset', offset.toString());
    if (inTune) {
        livePanel.dataset.inTune = 'true';
    } else {
        delete livePanel.dataset.inTune;
    }
    if (inTune) {
        setTuneState('in', 'Perfect!');
    } else if (displayCents > 0) {
        setTuneState('high', 'Lower');
    } else {
        setTuneState('low', 'Higher');
    }
    detectCount += 1;
    if (inTune) inTuneCount += 1;
    if (fallback) {
        setStatus(inTune ? 'Perfect! ✨' : formatCentsHint(displayCents));
        return;
    }
    if (Number.isFinite(stability) && stability >= 1) {
        setStatus(inTune ? 'Perfect! ✨' : formatCentsHint(displayCents));
        return;
    }
    setStatus(inTune ? 'Perfect! ✨' : formatCentsHint(displayCents));
};

const stopTuner = async () => {
    startToken += 1;
    starting = false;
    featureSessionId = null;
    lastFeatureAt = 0;
    firstNoteSent = false;
    tunerStartAt = null;
    resetBudgetBreaches();
    clearWorkletWatchdog();
    stopFallback();
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
    setStatus('Tap the mic to start tuning.');
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
    firstNoteSent = false;
    tunerStartAt = performance.now();
    resetBudgetBreaches();

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
        audioContext.addEventListener('statechange', () => {
            if (!audioContext) return;
            if (audioContext.state === 'suspended' && tunerToggle?.checked) {
                audioContext.resume().catch(() => {});
            }
        });
        featureSessionId = `tuner-${Date.now()}`;
        lastFeatureAt = 0;
        if (!audioContext.audioWorklet) {
            setStatus('AudioWorklet unavailable. Using fallback tuner…');
            await audioContext.resume();
            const startedFallback = await startFallback(audioContext, micStream);
            if (token !== startToken) {
                await stopTuner();
                return;
            }
            if (!startedFallback) {
                throw new Error('Fallback tuner unavailable');
            }
            starting = false;
            return;
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
        

        source.connect(workletNode).connect(silenceGain).connect(audioContext.destination);
        await audioContext.resume();
        if (token !== startToken) {
            await stopTuner();
            return;
        }
        workletNode.port.postMessage({ type: 'tolerance', value: tolerance });
        workletNode.port.postMessage({ type: 'stability', value: STABILITY_THRESHOLD });
        startWorkletWatchdog();

        workletNode.port.onmessage = (event) => {
            touchWorklet();
            const {
                frequency,
                note,
                cents,
                volume,
                inTune,
                error,
                ready,
                stableNote,
                stableCents,
                stability,
                fallback,
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
                if (Number.isFinite(bufferSize) && Number.isFinite(sampleRate)) {
                    const budgetState = budgetMonitor.update({
                        processMs,
                        bufferSize,
                        sampleRate,
                    });
                    if (budgetState.tripped) {
                        setStatus('Audio workload high. Switching to fallback…');
                        resetBudgetBreaches();
                        clearWorkletWatchdog();
                        if (workletNode) {
                            workletNode.port.onmessage = null;
                            workletNode.disconnect();
                            workletNode = null;
                        }
                        startFallback(audioContext, micStream);
                        return;
                    }
                }
            }

            if (error) {
                setStatus('WASM unavailable. Switching to fallback…');
                clearWorkletWatchdog();
                if (workletNode) {
                    workletNode.port.onmessage = null;
                    workletNode.disconnect();
                    workletNode = null;
                }
                startFallback(audioContext, micStream);
                return;
            }

            if (ready) {
                setStatus('Listening… play a note.');
                return;
            }

            handlePitchResult({
                frequency,
                note,
                cents,
                volume,
                inTune,
                stableNote,
                stableCents,
                stability,
                fallback,
            });
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
