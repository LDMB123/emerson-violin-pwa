import {
    cachedEl,
    readLiveNumber,
    markChecklistIf,
    setDifficultyBadge,
    attachTuning,
    getTonePlayer,
} from './shared.js';
import { isSoundEnabled } from '../utils/sound-state.js';
import { RT_STATE } from '../utils/event-names.js';
import {
    computeBeatInterval,
} from '../utils/rhythm-dash-utils.js';
import {
    resolveRhythmDashElements,
    updateStatusText,
    updateMeter,
} from './rhythm-dash/helpers.js';
import { createRhythmDashLifecycle } from './rhythm-dash/lifecycle.js';
import { createRhythmDashMetronome } from './rhythm-dash/metronome.js';
import { reportRhythmDashSession } from './rhythm-dash/session-reporting.js';
import { createRhythmDashRealtimeHandler } from './rhythm-dash/realtime-handler.js';
import { createRhythmDashBeatProcessor } from './rhythm-dash/beat-processor.js';
import {
    createRhythmDashRuntimeState,
    applyRhythmDashBeatRuntimeState,
} from './rhythm-dash/runtime-state.js';
import { createRhythmDashTargetRuntime } from './rhythm-dash/target-runtime.js';
import { createRhythmDashControlRuntime } from './rhythm-dash/control-runtime.js';
import { createRhythmDashViewState } from './rhythm-dash/view-state.js';
import { bindRhythmDashUiControls } from './rhythm-dash/ui-bindings.js';
import { createRhythmDashBindingState } from './rhythm-dash/binding-state.js';

const rhythmScoreEl = cachedEl('[data-rhythm="score"]');
const rhythmComboEl = cachedEl('[data-rhythm="combo"]');
const rhythmDashLifecycle = createRhythmDashLifecycle();
const rhythmDashBindingState = createRhythmDashBindingState({
    lifecycle: rhythmDashLifecycle,
});

const updateRhythmDash = () => {
    const inputs = Array.from(document.querySelectorAll('#view-game-rhythm-dash input[id^="rd-set-"]'));
    if (!inputs.length) return;
    const checked = inputs.filter((input) => input.checked).length;
    const scoreEl = rhythmScoreEl();
    const comboEl = rhythmComboEl();
    const liveScore = readLiveNumber(scoreEl, 'liveScore');
    const liveCombo = readLiveNumber(comboEl, 'liveCombo');

    if (scoreEl) {
        scoreEl.textContent = String(Number.isFinite(liveScore) ? liveScore : (checked * 25 + (checked === inputs.length ? 20 : 0)));
    }
    if (comboEl) {
        const combo = Number.isFinite(liveCombo) ? liveCombo : checked;
        comboEl.textContent = `x${combo}`;
    }
};

const bindRhythmDash = (difficulty = { speed: 1.0, complexity: 1 }) => {
    const stage = document.querySelector('#view-game-rhythm-dash');
    if (!stage) return;
    rhythmDashBindingState.cleanup();

    const {
        tapButton,
        runToggle,
        pauseButton,
        settingsButton,
        scoreEl,
        comboEl,
        bpmEl,
        suggestedEl,
        statusEl,
        ratingEl,
        meterFill,
        meterTrack,
        levelDisplay,
        bpmDisplay,
        energyBar,
    } = resolveRhythmDashElements(stage);
    const viewState = createRhythmDashViewState({
        scoreEl,
        comboEl,
        bpmEl,
    });

    const initialTargetBpm = Math.round(90 * difficulty.speed);
    const runtime = createRhythmDashRuntimeState({
        targetBpm: initialTargetBpm,
        beatInterval: computeBeatInterval(initialTargetBpm),
    });
    const coachTarget = runtime.targetBpm;
    const metronome = createRhythmDashMetronome({
        isEnabled: isSoundEnabled,
        getPlayer: getTonePlayer,
        getBeatInterval: () => runtime.beatInterval,
    });

    if (!tapButton) return;

    const setStatus = (message) => updateStatusText(statusEl, message);

    const setRating = (label, level, scoreValue) => {
        if (ratingEl) {
            ratingEl.textContent = `Timing: ${label}`;
            if (level) ratingEl.dataset.level = level;
        }
        updateMeter(meterFill, meterTrack, scoreValue);
    };

    rhythmDashBindingState.setTuningReport(attachTuning('rhythm-dash', (tuning) => {
        setDifficultyBadge(stage.querySelector('.game-header'), tuning.difficulty);
        if (!runtime.wasRunning) {
            setStatus(`Tap Start to begin. Target ${runtime.targetBpm} BPM.`);
        }
    }));

    const reportSession = () => {
        const result = reportRhythmDashSession({
            reported: runtime.reported,
            tapCount: runtime.tapCount,
            timingScores: runtime.timingScores,
            tapHistory: runtime.tapHistory,
            targetBpm: runtime.targetBpm,
            score: runtime.score,
            tuningReport: rhythmDashBindingState.getTuningReport(),
            stage,
            difficulty,
            runStartedAt: runtime.runStartedAt,
            mistakes: runtime.mistakes,
        });
        runtime.reported = result.reported;
    };

    const stopMetronome = () => metronome.stop();

    const startMetronome = () => metronome.start();

    const targetRuntime = createRhythmDashTargetRuntime({
        stage,
        targetSlider,
        targetValue,
        setStatus,
        runToggle,
        startMetronome,
        runtime,
    });
    const { updateTargetBpm } = targetRuntime;

    const {
        updateRunningState,
        pauseRun,
        bindPauseButton,
        resetRun,
    } = createRhythmDashControlRuntime({
        stage,
        runToggle,
        setStatus,
        setRating,
        startMetronome,
        stopMetronome,
        reportSession,
        runtime,
        ...viewState,
        meterTrack,
    });

    const processBeat = createRhythmDashBeatProcessor({
        getRuntimeState: () => ({
            combo: runtime.combo,
            score: runtime.score,
            tapCount: runtime.tapCount,
            mistakes: runtime.mistakes,
            timingScores: runtime.timingScores,
            runStartedAt: runtime.runStartedAt,
            level: runtime.level,
            energy: runtime.energy,
            targetBpm: runtime.targetBpm,
        }),
        applyRuntimeState: (nextState) => {
            applyRhythmDashBeatRuntimeState(runtime, nextState);
        },
        setLiveScore: viewState.setLiveScore,
        setLiveCombo: viewState.setLiveCombo,
        setRating,
        bpmEl,
        energyBar,
        levelDisplay,
        setStatus,
        markChecklistIf,
        pauseRun,
    });

    bindRhythmDashUiControls({
        runToggle,
        updateRunningState,
        targetSlider,
        updateTargetBpm,
        bindTargetControls: targetRuntime.bindTargetControls,
        settingsReset,
        getCoachTarget: () => coachTarget,
        bindPauseButton,
        pauseButton,
        settingsButton,
        setStatus,
        tapButton,
        runtime,
        suggestedEl,
        processBeat,
    });

    const realtimeStateHandler = createRhythmDashRealtimeHandler({
        expectedHash: '#view-game-rhythm-dash',
        runToggle,
        setStatus,
        getBeatInterval: () => runtime.beatInterval,
        realtimeTempoHistory: runtime.realtimeTempoHistory,
        suggestedEl,
        bpmEl,
        processBeat,
        getTargetBpm: () => runtime.targetBpm,
        setRealtimeListening: (value) => {
            runtime.realtimeListening = value;
        },
    });
    rhythmDashBindingState.setRealtimeStateHandler(realtimeStateHandler);
    document.addEventListener(RT_STATE, realtimeStateHandler);

    rhythmDashLifecycle.bind({
        runToggle,
        resetRun,
        reportSession,
        pauseRun,
        setStatus,
        getPausedByVisibility: () => runtime.pausedByVisibility,
        setPausedByVisibility: (value) => {
            runtime.pausedByVisibility = value;
        },
        startMetronome,
        stopMetronome,
    });
};

export { updateRhythmDash as update, bindRhythmDash as bind };
