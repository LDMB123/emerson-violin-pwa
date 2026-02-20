import { formatTime } from '../games/session-timer.js';
import {
    LESSON_COMPLETE,
    PRACTICE_STEP_STARTED,
    PRACTICE_STEP_COMPLETED,
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

export const createLessonRunnerActions = ({
    runnerState,
    timerEl,
    startButton,
    nextButton,
    ctaButton,
    setStatus,
    updateProgress,
    syncStepList,
    updateStepDetails,
}) => {
    const getCurrentStep = () => getCurrentRunnerStep(runnerState);

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

        dispatchLessonRunnerEvent({
            state: 'complete',
            step: completedStep,
            index: stepIndex,
            total: totalSteps,
        });
        dispatchPracticeRunnerEvent({
            eventName: PRACTICE_STEP_COMPLETED,
            step: completedStep,
            index: stepIndex,
            total: totalSteps,
        });

        if (isRunnerComplete(runnerState)) {
            setStatus('Lesson complete! Awesome work.');
            if (startButton) startButton.textContent = 'Restart';
            if (nextButton) nextButton.disabled = true;
            if (ctaButton) ctaButton.setAttribute('href', '#view-games');
            document.dispatchEvent(new CustomEvent(LESSON_COMPLETE));
        } else {
            setStatus(auto ? 'Step complete. Ready for the next one.' : 'Step marked complete. Tap Next to continue.');
            if (startButton) startButton.textContent = 'Start';
            if (nextButton) nextButton.disabled = false;
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
        if (nextButton) nextButton.disabled = false;

        dispatchLessonRunnerEvent({
            state: 'start',
            step: startedStep,
            index: runnerState.currentIndex,
            total: runnerState.steps.length,
        });
        dispatchPracticeRunnerEvent({
            eventName: PRACTICE_STEP_STARTED,
            step: startedStep,
            index: runnerState.currentIndex,
            total: runnerState.steps.length,
        });

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
        if (nextButton) nextButton.disabled = false;
        dispatchLessonRunnerEvent({
            state: 'pause',
            step: getCurrentStep(),
            index: runnerState.currentIndex,
            total: runnerState.steps.length,
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
