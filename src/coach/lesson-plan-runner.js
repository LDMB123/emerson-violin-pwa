import { getLearningRecommendations } from '../ml/recommendations.js';
import {
    createRunnerMarkup,
    renderEmptyRunnerStep,
    renderRunnerStep,
    syncRunnerStepList,
    updateRunnerProgress,
} from './lesson-plan-runner-view.js';
import { setupLessonRunnerLifecycle } from './lesson-plan-runner-lifecycle.js';
import {
    createLessonRunnerState,
    getCurrentRunnerStep,
    hasRunnerSteps,
    setRunnerPlanFromRecommendations,
} from './lesson-plan-runner-machine.js';
import { createLessonRunnerActions } from './lesson-plan-runner-actions.js';

const setupLessonPlan = () => {
    const planPanel = document.querySelector('[data-lesson-plan="coach"]');
    if (!planPanel) return () => {};

    const existingRunner = planPanel.querySelector('[data-lesson-runner]');
    if (existingRunner) existingRunner.remove();

    const stepsList = planPanel.querySelector('[data-lesson-steps]');
    const planCta = planPanel.querySelector('[data-lesson="cta"]');
    const runner = createRunnerMarkup();

    if (planCta) {
        planPanel.insertBefore(runner, planCta);
    } else {
        planPanel.appendChild(runner);
    }

    const statusEl = runner.querySelector('[data-lesson-runner-status]');
    const stepEl = runner.querySelector('[data-lesson-runner-step]');
    const cueEl = runner.querySelector('[data-lesson-runner-cue]');
    const timerEl = runner.querySelector('[data-lesson-runner-timer]');
    const trackEl = runner.querySelector('[data-lesson-runner-track]');
    const fillEl = runner.querySelector('[data-lesson-runner-fill]');
    const startButton = runner.querySelector('[data-lesson-runner-start]');
    const nextButton = runner.querySelector('[data-lesson-runner-next]');
    const ctaButton = runner.querySelector('[data-lesson-runner-cta]');

    const runnerState = createLessonRunnerState();

    const setStatus = (message) => {
        if (statusEl) statusEl.textContent = message;
    };

    const getCurrentStep = () => getCurrentRunnerStep(runnerState);

    const updateProgress = () => {
        updateRunnerProgress({
            steps: runnerState.steps,
            currentStep: getCurrentStep(),
            completedSteps: runnerState.completedSteps,
            remainingSeconds: runnerState.remainingSeconds,
            timerId: runnerState.timerId,
            fillEl,
            trackEl,
        });
    };

    const syncStepList = () => {
        syncRunnerStepList({
            stepsList,
            steps: runnerState.steps,
            completedSteps: runnerState.completedSteps,
            currentStepId: getCurrentStep()?.id || null,
        });
    };

    const renderEmptyStep = () => {
        renderEmptyRunnerStep({
            stepEl,
            cueEl,
            timerEl,
            startButton,
            nextButton,
            ctaButton,
            updateProgress,
        });
    };

    const renderCurrentStep = (step) => {
        renderRunnerStep({
            step,
            currentIndex: runnerState.currentIndex,
            stepsLength: runnerState.steps.length,
            recommendedGameId: runnerState.recommendedGameId,
            remainingSeconds: runnerState.remainingSeconds,
            completedSteps: runnerState.completedSteps,
            stepEl,
            cueEl,
            timerEl,
            startButton,
            nextButton,
            ctaButton,
            updateProgress,
        });
    };

    const updateStepDetails = () => {
        if (!hasRunnerSteps(runnerState)) {
            renderEmptyStep();
            return;
        }
        renderCurrentStep(getCurrentStep());
        syncStepList();
        updateProgress();
    };

    const actions = createLessonRunnerActions({
        runnerState,
        timerEl,
        startButton,
        nextButton,
        ctaButton,
        setStatus,
        updateProgress,
        syncStepList,
        updateStepDetails,
    });

    const refreshPlan = async ({ externalMission = null } = {}) => {
        const recs = await getLearningRecommendations();
        setRunnerPlanFromRecommendations(runnerState, recs, externalMission);
        updateStepDetails();
    };

    startButton?.addEventListener('click', actions.handleStartClick);
    nextButton?.addEventListener('click', actions.handleNextClick);

    refreshPlan();

    const onMlUpdate = () => refreshPlan();
    const onMlReset = () => refreshPlan();
    const onMlRecs = () => refreshPlan();
    const onMissionUpdated = (event) => {
        refreshPlan({ externalMission: event?.detail?.mission }).catch(() => {});
    };

    const teardownLifecycle = setupLessonRunnerLifecycle({
        stepsList,
        syncStepList,
        stopTimer: actions.stopTimer,
        pauseStep: actions.pauseStep,
        startButton,
        onMlUpdate,
        onMlReset,
        onMlRecs,
        onMissionUpdated,
    });

    return () => {
        actions.stopTimer();
        startButton?.removeEventListener('click', actions.handleStartClick);
        nextButton?.removeEventListener('click', actions.handleNextClick);
        teardownLifecycle();
    };
};

export { setupLessonPlan };
