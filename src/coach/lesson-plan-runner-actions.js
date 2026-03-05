import {
    LESSON_COMPLETE,
    PRACTICE_STEP_STARTED,
    PRACTICE_STEP_COMPLETED,
    emitEvent,
} from '../utils/event-names.js';
import {
    dispatchLessonRunnerEvent,
    dispatchPracticeRunnerEvent,
    markRunnerGoalComplete,
} from './lesson-plan-runner-events.js';
import {
    renderRunnerTimer,
    setRunnerControls,
} from './lesson-plan-runner-view.js';
import {
    completeCurrentRunnerStep,
    decrementRunnerTimer,
    getCurrentRunnerStep,
    hasRunnerSteps,
    isRunnerComplete,
    restartRunner,
    startCurrentRunnerStep,
} from './lesson-plan-runner-machine.js';
import { createIntervalTicker } from '../utils/interval-ticker.js';

export const createLessonRunnerActions = (deps) => {
    const {
        runnerState,
        controls = {},
        callbacks = {},
    } = deps;
    const {
        timerEl,
        startButton,
        nextButton,
        ctaButton,
    } = controls;
    const {
        setStatus,
        updateProgress,
        syncStepList,
        updateStepDetails,
    } = callbacks;
    const runnerControls = { startButton, nextButton };

    const getCurrentStep = () => getCurrentRunnerStep(runnerState);
    const buildStepEventPayload = (step) => ({
        step,
        index: runnerState.currentIndex,
        total: runnerState.steps.length,
    });
    const dispatchStartEvents = (step) => {
        const payload = buildStepEventPayload(step);
        dispatchLessonRunnerEvent({
            state: 'start',
            ...payload,
        });
        dispatchPracticeRunnerEvent({
            eventName: PRACTICE_STEP_STARTED,
            ...payload,
        });
    };
    const renderTimer = () => renderRunnerTimer(timerEl, runnerState.remainingSeconds);
    const syncTimerHandle = () => {
        runnerState.timerId = timerTicker.getId();
    };

    const stopTimer = () => {
        timerTicker.stop();
        syncTimerHandle();
    };

    const completeStep = ({ auto = false } = {}) => {
        const step = getCurrentStep();
        if (!step) return;

        const stepIndex = runnerState.currentIndex;
        const totalSteps = runnerState.steps.length;
        const timestamp = Date.now();

        stopTimer();
        markRunnerGoalComplete(step.id);
        const completedStep = completeCurrentRunnerStep(runnerState, timestamp);
        if (!completedStep) return;
        const completionPayload = {
            step: completedStep,
            index: stepIndex,
            total: totalSteps,
        };

        dispatchLessonRunnerEvent({
            state: 'complete',
            ...completionPayload,
        });
        dispatchPracticeRunnerEvent({
            eventName: PRACTICE_STEP_COMPLETED,
            ...completionPayload,
        });

        if (isRunnerComplete(runnerState)) {
            setStatus('Lesson complete! Awesome work.');
            setRunnerControls(runnerControls, { startLabel: 'Restart', nextDisabled: true });
            if (ctaButton) ctaButton.setAttribute('href', '#view-games');
            emitEvent(LESSON_COMPLETE);
        } else {
            setStatus(auto ? 'Step complete. Ready for the next one.' : 'Step marked complete. Tap Next to continue.');
            setRunnerControls(runnerControls, { startLabel: 'Start', nextDisabled: false });
        }
        updateStepDetails();
    };

    const tick = () => {
        if (!decrementRunnerTimer(runnerState)) {
            completeStep({ auto: true });
            return;
        }
        renderTimer();
        updateProgress();
    };
    const timerTicker = createIntervalTicker({
        onTick: tick,
        intervalMs: 1000,
    });

    const startStep = () => {
        if (!hasRunnerSteps(runnerState)) return;

        const startedStep = startCurrentRunnerStep(runnerState, Date.now());
        if (!startedStep) return;

        stopTimer();
        setStatus('Step in progress.');
        setRunnerControls(runnerControls, { startLabel: 'Pause', nextDisabled: false });

        dispatchStartEvents(startedStep);

        timerTicker.start();
        syncTimerHandle();
        renderTimer();
        updateProgress();
        syncStepList();
    };

    const pauseStep = () => {
        if (!timerTicker.isRunning()) return;
        stopTimer();
        setStatus('Paused. Tap Resume when ready.');
        setRunnerControls(runnerControls, { startLabel: 'Resume', nextDisabled: false });
        const pausedPayload = buildStepEventPayload(getCurrentStep());
        dispatchLessonRunnerEvent({
            state: 'pause',
            ...pausedPayload,
        });
    };

    const handleStartClick = () => {
        if (!hasRunnerSteps(runnerState)) return;
        if (isRunnerComplete(runnerState)) {
            restartRunner(runnerState);
            setStatus('Lesson restarted.');
            updateStepDetails();
            startStep();
            return;
        }
        if (timerTicker.isRunning()) {
            pauseStep();
        } else {
            startStep();
        }
    };

    const handleNextClick = () => {
        if (!hasRunnerSteps(runnerState)) return;
        if (timerTicker.isRunning()) {
            completeStep({ auto: false });
            return;
        }
        if (isRunnerComplete(runnerState)) return;
        startStep();
    };

    return {
        stopTimer,
        pauseStep,
        handleStartClick,
        handleNextClick,
    };
};
