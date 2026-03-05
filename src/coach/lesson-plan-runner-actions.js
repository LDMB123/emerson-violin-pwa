import { formatTime } from '../games/session-timer.js';
import { setDisabled } from '../utils/dom-utils.js';
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
    completeCurrentRunnerStep,
    decrementRunnerTimer,
    getCurrentRunnerStep,
    hasRunnerSteps,
    isRunnerComplete,
    restartRunner,
    startCurrentRunnerStep,
} from './lesson-plan-runner-machine.js';

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

    const stopTimer = () => {
        if (!runnerState.timerId) return;
        clearInterval(runnerState.timerId);
        runnerState.timerId = null;
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
            if (startButton) startButton.textContent = 'Restart';
            setDisabled(nextButton, true);
            if (ctaButton) ctaButton.setAttribute('href', '#view-games');
            emitEvent(LESSON_COMPLETE);
        } else {
            setStatus(auto ? 'Step complete. Ready for the next one.' : 'Step marked complete. Tap Next to continue.');
            if (startButton) startButton.textContent = 'Start';
            setDisabled(nextButton, false);
        }
        updateStepDetails();
    };

    const tick = () => {
        if (!decrementRunnerTimer(runnerState)) {
            completeStep({ auto: true });
            return;
        }
        if (timerEl) timerEl.textContent = formatTime(runnerState.remainingSeconds * 1000);
        updateProgress();
    };

    const startStep = () => {
        if (!hasRunnerSteps(runnerState)) return;

        const startedStep = startCurrentRunnerStep(runnerState, Date.now());
        if (!startedStep) return;

        stopTimer();
        setStatus('Step in progress.');
        if (startButton) startButton.textContent = 'Pause';
        setDisabled(nextButton, false);

        dispatchStartEvents(startedStep);

        runnerState.timerId = window.setInterval(tick, 1000);
        if (timerEl) timerEl.textContent = formatTime(runnerState.remainingSeconds * 1000);
        updateProgress();
        syncStepList();
    };

    const pauseStep = () => {
        if (!runnerState.timerId) return;
        stopTimer();
        setStatus('Paused. Tap Resume when ready.');
        if (startButton) startButton.textContent = 'Resume';
        setDisabled(nextButton, false);
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
        if (runnerState.timerId) {
            pauseStep();
        } else {
            startStep();
        }
    };

    const handleNextClick = () => {
        if (!hasRunnerSteps(runnerState)) return;
        if (runnerState.timerId) {
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
