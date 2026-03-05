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

const updateRunnerStepState = (state, updater) => {
    state.steps = updater(state.steps);
    applyRunnerPosition(state);
};
const updateSingleRunnerStep = (state, step, timestamp, marker) => {
    updateRunnerStepState(state, (steps) => marker(steps, step.id, timestamp));
};

/**
 * Creates the mutable state used by the lesson runner.
 *
 * @returns {{
 *   steps: any[],
 *   currentIndex: number,
 *   completedSteps: number,
 *   remainingSeconds: number,
 *   timerId: number | null,
 *   recommendedGameId: string
 * }}
 */
export const createLessonRunnerState = () => ({
    steps: [],
    currentIndex: 0,
    completedSteps: 0,
    remainingSeconds: 0,
    timerId: null,
    recommendedGameId: 'view-games',
});

/**
 * Returns the current runner step, if any.
 *
 * @param {{ steps: any[], currentIndex: number }} state
 * @returns {any | null}
 */
export const getCurrentRunnerStep = (state) => state.steps[state.currentIndex] || null;

/**
 * Returns whether the runner currently has any steps.
 *
 * @param {{ steps: any[] }} state
 * @returns {boolean}
 */
export const hasRunnerSteps = (state) => state.steps.length > 0;

/**
 * Returns whether the runner has completed all steps.
 *
 * @param {{ steps: any[], completedSteps: number }} state
 * @returns {boolean}
 */
export const isRunnerComplete = (state) => state.steps.length > 0
    && state.completedSteps >= state.steps.length;

/**
 * Rebuilds the runner plan from recommendations or an external mission.
 *
 * @param {any} state
 * @param {any} recs
 * @param {any | null} [externalMission=null]
 * @returns {void}
 */
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

/**
 * Resets runner progress back to the start of the current plan.
 *
 * @param {any} state
 * @returns {void}
 */
export const restartRunner = (state) => {
    state.steps = resetRunnerSteps(state.steps);
    state.remainingSeconds = 0;
    applyRunnerPosition(state);
};

/**
 * Starts the current runner step and initializes its countdown.
 *
 * @param {any} state
 * @param {number} [timestamp=Date.now()]
 * @returns {any | null}
 */
export const startCurrentRunnerStep = (state, timestamp = Date.now()) => {
    if (!hasRunnerSteps(state)) return null;
    if (isRunnerComplete(state)) restartRunner(state);

    const step = getCurrentRunnerStep(state);
    if (!step) return null;

    const duration = computeStepDuration(step.minutes);
    if (!state.remainingSeconds || state.remainingSeconds > duration) {
        state.remainingSeconds = duration;
    }

    updateSingleRunnerStep(state, step, timestamp, markRunnerStepInProgress);
    return step;
};

/**
 * Marks the current runner step complete and clears the timer.
 *
 * @param {any} state
 * @param {number} [timestamp=Date.now()]
 * @returns {any | null}
 */
export const completeCurrentRunnerStep = (state, timestamp = Date.now()) => {
    const step = getCurrentRunnerStep(state);
    if (!step) return null;
    state.remainingSeconds = 0;
    updateSingleRunnerStep(state, step, timestamp, markRunnerStepComplete);
    return step;
};

/**
 * Decrements the runner countdown by one second when time remains.
 *
 * @param {{ remainingSeconds: number }} state
 * @returns {boolean}
 */
export const decrementRunnerTimer = (state) => {
    if (state.remainingSeconds <= 0) return false;
    state.remainingSeconds -= 1;
    return true;
};
