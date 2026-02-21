import { getGameTuning, updateGameResult } from '../ml/adaptive-engine.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { setDifficultyBadge } from '../games/shared.js';
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

const DEFAULT_BPM = 100;

export const createMetronomeController = () => {
    let elements = createEmptyMetronomeElements();
    let metronomeBpm = DEFAULT_BPM;
    let metronomeTimer = null;
    let metronomePlayer = null;
    let tapTimes = [];
    let targetBpm = 90;
    let metronomeReported = false;
    let metronomeTouched = false;

    const setStatus = (message) => {
        if (elements.status) {
            elements.status.textContent = message;
        }
    };

    const syncRunningState = () => {
        syncMetronomeRunningState({ elements, running: Boolean(metronomeTimer) });
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

    const stop = ({ silent = false } = {}) => {
        if (!silent) {
            report();
        }
        if (metronomeTimer) {
            clearInterval(metronomeTimer);
            metronomeTimer = null;
        }
        tapTimes = [];
        syncRunningState();
        if (!silent) {
            setStatus('Metronome paused.');
        }
    };

    const start = () => {
        if (metronomeTimer) return;
        if (!isSoundEnabled()) {
            setStatus('Sounds are off. Turn on Sounds to hear the click.');
            return;
        }
        const interval = calculateMetronomeInterval(metronomeBpm);
        playClick();
        metronomeTimer = window.setInterval(playClick, interval);
        syncRunningState();
        setStatus(`Running at ${metronomeBpm} BPM.`);
    };

    const refreshMetronome = () => {
        if (metronomeTimer) {
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
        if (!metronomeTimer) {
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
            isRunning: () => Boolean(metronomeTimer),
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
            if (elements.toggle) elements.toggle.disabled = true;
            if (elements.tap) elements.tap.disabled = true;
            setStatus(message);
        },
        bindControls,
        report,
        stop,
        isRunning() {
            return Boolean(metronomeTimer);
        },
    };
};
