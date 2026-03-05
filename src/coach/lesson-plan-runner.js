import { getLearningRecommendations } from '../ml/recommendations.js';
import {
    createRunnerMarkup,
    createRunnerRenderers,
    createRunnerViewState,
} from './lesson-plan-runner-view.js';
import { setupLessonRunnerLifecycle } from './lesson-plan-runner-lifecycle.js';
import {
    createLessonRunnerState,
    getCurrentRunnerStep,
    setRunnerPlanFromRecommendations,
} from './lesson-plan-runner-machine.js';
import { createLessonRunnerActions } from './lesson-plan-runner-actions.js';
import { createTextContentSetter } from '../utils/dom-utils.js';

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

    const runnerView = createRunnerViewState({ runner, stepsList });
    const runnerState = createLessonRunnerState();
    const {
        statusEl,
        timerEl,
        startButton,
        nextButton,
        ctaButton,
    } = runnerView;

    const setStatus = createTextContentSetter(() => statusEl);
    const getCurrentStep = () => getCurrentRunnerStep(runnerState);
    const {
        updateProgress,
        syncStepList,
        updateStepDetails,
    } = createRunnerRenderers({
        runnerState,
        runnerView,
        getCurrentStep,
    });

    const actions = createLessonRunnerActions({
        runnerState,
        controls: {
            timerEl,
            startButton,
            nextButton,
            ctaButton,
        },
        callbacks: {
            setStatus,
            updateProgress,
            syncStepList,
            updateStepDetails,
        },
    });

    const refreshPlan = async ({ externalMission = null } = {}) => {
        const recs = await getLearningRecommendations();
        setRunnerPlanFromRecommendations(runnerState, recs, externalMission);
        updateStepDetails();
    };

    startButton?.addEventListener('click', actions.handleStartClick);
    nextButton?.addEventListener('click', actions.handleNextClick);

    refreshPlan();

    const onRecommendationSignal = () => refreshPlan();
    const onMissionUpdated = (event) => {
        refreshPlan({ externalMission: event?.detail?.mission }).catch(() => null);
    };

    const teardownLifecycle = setupLessonRunnerLifecycle({
        stepsList,
        syncStepList,
        stopTimer: actions.stopTimer,
        pauseStep: actions.pauseStep,
        startButton,
        onMlUpdate: onRecommendationSignal,
        onMlReset: onRecommendationSignal,
        onMlRecs: onRecommendationSignal,
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
