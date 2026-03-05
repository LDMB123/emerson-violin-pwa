import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { setDifficultyBadge } from '../games/shared.js';
import { setDisabled } from '../utils/dom-utils.js';
import { createTonePlayer } from '../audio/tone-player.js';
import {
    calculateMetronomeInterval,
    clampBpm,
    calculateMetronomeAccuracy,
} from './trainer-utils.js';
import {
    createEmptyMetronomeElements,
    updateMetronomeDisplay,
    syncMetronomeRunningState,
} from './metronome-controller-view.js';
import {
    bindMetronomeSliderControl,
    bindMetronomeToggleControl,
    bindMetronomeTapControl,
} from './metronome-controller-bindings.js';
import { createIntervalTicker } from '../utils/interval-ticker.js';

const DEFAULT_BPM = 100;

export const createMetronomeController = () => {
    let elements = createEmptyMetronomeElements();
    let metronomeBpm = DEFAULT_BPM;
    let metronomeTicker = null;
    let metronomePlayer = null;
    let tapTimes = [];
    let targetBpm = 90;
    let metronomeReported = false;
    let metronomeTouched = false;
    let pausedByVisibility = false;

    const setStatus = (message) => {
        if (elements.status) {
            elements.status.textContent = message;
        }
    };

    const isMetronomeRunning = () => Boolean(metronomeTicker?.isRunning?.());

    const syncRunningState = () => {
        syncMetronomeRunningState({ elements, running: isMetronomeRunning() });
    };

    const updateDisplay = () => {
        updateMetronomeDisplay({ elements, bpm: metronomeBpm });
    };

    const getPlayer = () => {
        if (!metronomePlayer) {
            metronomePlayer = createTonePlayer();
        }
        return metronomePlayer;
    };

    const playVisualMetronome = () => {
        const mascot = document.querySelector('.trainer-mascot');
        if (!mascot) return;
        // Retrigger CSS animation
        mascot.classList.remove('metronome-tick');
        void mascot.offsetWidth; // trigger reflow
        mascot.classList.add('metronome-tick');
    };

    const playClick = () => {
        playVisualMetronome();
        if (!isSoundEnabled()) return;
        getPlayer().scheduleTone(880, { duration: 0.08, volume: 0.18 });
    };

    const report = () => {
        if (metronomeReported || !targetBpm || !metronomeTouched) return;
        metronomeReported = true;
        metronomeTouched = false;
        const accuracy = calculateMetronomeAccuracy(metronomeBpm, targetBpm);
        updateGameResult('trainer-metronome', { accuracy, score: metronomeBpm }).catch(() => { });
    };

    const clearMetronomeLoop = () => {
        if (metronomeTicker) {
            metronomeTicker.stop();
            metronomeTicker = null;
        }
        syncRunningState();
    };

    const startMetronomeLoop = ({ announce = true } = {}) => {
        if (isMetronomeRunning()) return true;
        if (!isSoundEnabled()) {
            if (announce) {
                setStatus('Sounds are off. Turn on Sounds to hear the click.');
            }
            return false;
        }
        const interval = calculateMetronomeInterval(metronomeBpm);
        playClick();
        metronomeTicker = createIntervalTicker({
            onTick: playClick,
            intervalMs: interval,
            setIntervalFn: window.setInterval,
            clearIntervalFn: window.clearInterval,
        });
        metronomeTicker.start();
        syncRunningState();
        if (announce) {
            setStatus(`Running at ${metronomeBpm} BPM.`);
        }
        return true;
    };

    const pauseForVisibility = () => {
        if (!isMetronomeRunning()) return false;
        pausedByVisibility = true;
        clearMetronomeLoop();
        return true;
    };

    const resumeForVisibility = () => {
        if (!pausedByVisibility) return false;
        if (document.visibilityState !== 'visible') return false;
        const resumed = startMetronomeLoop({ announce: false });
        pausedByVisibility = false;
        if (resumed) {
            setStatus(`Running at ${metronomeBpm} BPM.`);
        }
        return resumed;
    };

    const stop = ({ silent = false } = {}) => {
        if (!silent) {
            report();
        }
        pausedByVisibility = false;
        clearMetronomeLoop();
        tapTimes = [];
        if (!silent) {
            setStatus('Metronome paused.');
        }
    };

    const start = () => {
        pausedByVisibility = false;
        startMetronomeLoop();
    };

    const refreshMetronome = () => {
        if (isMetronomeRunning()) {
            stop({ silent: true });
            start();
            return;
        }
        updateDisplay();
    };

    const updateBpm = (value) => {
        const parsed = Number.parseInt(value, 10);
        if (Number.isNaN(parsed)) return;
        metronomeBpm = clampBpm(parsed);
        updateDisplay();
        refreshMetronome();
    };

    const markTouched = () => {
        metronomeTouched = true;
    };

    const resetReported = () => {
        metronomeReported = false;
    };

    const applyTuning = async () => {
        const tuning = await getGameTuning('trainer-metronome');
        targetBpm = tuning.targetBpm ?? targetBpm;
        setDifficultyBadge(document.querySelector('#metronome-loops .audio-panel-header'), tuning.difficulty, 'Tempo');

        if (elements.slider && !elements.slider.dataset.userSet) {
            updateBpm(targetBpm);
        }
        if (!isMetronomeRunning()) {
            setStatus(`Suggested tempo: ${targetBpm} BPM.`);
        }
    };

    const bindControls = () => {
        bindMetronomeSliderControl({
            slider: elements.slider,
            updateBpm,
            markTouched,
            resetReported,
        });

        bindMetronomeToggleControl({
            toggle: elements.toggle,
            isRunning: isMetronomeRunning,
            stop,
            start,
            markTouched,
        });

        bindMetronomeTapControl({
            tap: elements.tap,
            slider: elements.slider,
            readTapTimes: () => tapTimes,
            writeTapTimes: (nextTapTimes) => {
                tapTimes = nextTapTimes;
            },
            updateBpm,
            setStatus,
            getCurrentBpm: () => metronomeBpm,
            report,
            markTouched,
            resetReported,
        });
    };

    return {
        setElements(nextElements) {
            elements = {
                ...createEmptyMetronomeElements(),
                ...nextElements,
            };
        },
        setStatus,
        updateDisplay,
        syncRunningState,
        refreshTuningState({ resetUserSet = false } = {}) {
            if (resetUserSet && elements.slider) {
                delete elements.slider.dataset.userSet;
            }
            resetReported();
            applyTuning();
        },
        disableControls(message) {
            setDisabled(elements.toggle, true);
            setDisabled(elements.tap, true);
            setStatus(message);
        },
        bindControls,
        report,
        stop,
        pauseForVisibility,
        resumeForVisibility,
        isRunning: isMetronomeRunning,
    };
};
