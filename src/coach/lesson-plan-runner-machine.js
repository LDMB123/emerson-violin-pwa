import { computeStepDuration } from '../utils/lesson-plan-utils.js';
import {
    deriveRunnerPosition,
    mapMissionRunnerSteps,
    mapLessonRunnerSteps,
    resetRunnerSteps,
    markRunnerStepInProgress,
    markRunnerStepComplete,
} from './lesson-plan-runner-state.js';

const applyRunnerPosition = (state) => {
    const position = deriveRunnerPosition(state.steps);
    state.completedSteps = position.completedSteps;
    state.currentIndex = position.currentIndex;
};

export const createLessonRunnerState = () => ({
    steps: [],
    currentIndex: 0,
    completedSteps: 0,
    remainingSeconds: 0,
    timerId: null,
    recommendedGameId: 'view-games',
});

export const getCurrentRunnerStep = (state) => state.steps[state.currentIndex] || null;

export const hasRunnerSteps = (state) => state.steps.length > 0;

export const isRunnerComplete = (state) => state.steps.length > 0
    && state.completedSteps >= state.steps.length;

export const setRunnerPlanFromRecommendations = (state, recs, externalMission = null) => {
    state.recommendedGameId = recs?.recommendedGameId || recs?.recommendedGame || 'view-games';
    const missionSteps = externalMission?.steps || recs?.mission?.steps;
    if (Array.isArray(missionSteps) && missionSteps.length) {
        state.steps = mapMissionRunnerSteps(missionSteps);
    } else {
        state.steps = mapLessonRunnerSteps(recs?.lessonSteps || [], state.recommendedGameId);
    }
    applyRunnerPosition(state);
};

export const restartRunner = (state) => {
    state.steps = resetRunnerSteps(state.steps);
    state.remainingSeconds = 0;
    applyRunnerPosition(state);
};

export const startCurrentRunnerStep = (state, timestamp = Date.now()) => {
    if (!hasRunnerSteps(state)) return null;
    if (isRunnerComplete(state)) restartRunner(state);

    const step = getCurrentRunnerStep(state);
    if (!step) return null;

    const duration = computeStepDuration(step.minutes);
    if (!state.remainingSeconds || state.remainingSeconds > duration) {
        state.remainingSeconds = duration;
    }

    state.steps = markRunnerStepInProgress(state.steps, step.id, timestamp);
    applyRunnerPosition(state);
    return step;
};

export const completeCurrentRunnerStep = (state, timestamp = Date.now()) => {
    const step = getCurrentRunnerStep(state);
    if (!step) return null;
    state.remainingSeconds = 0;
    state.steps = markRunnerStepComplete(state.steps, step.id, timestamp);
    applyRunnerPosition(state);
    return step;
};

export const decrementRunnerTimer = (state) => {
    if (state.remainingSeconds <= 0) return false;
    state.remainingSeconds -= 1;
    return true;
};
