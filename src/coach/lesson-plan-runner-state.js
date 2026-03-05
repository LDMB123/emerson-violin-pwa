import { atLeast1 } from '../utils/math.js';

const toStepBase = ({
    step,
    index,
    stepPrefix,
    defaultCta,
}) => ({
    id: step?.id || `${stepPrefix}-${index + 1}`,
    label: step?.label || `Practice step ${index + 1}`,
    cue: step?.cue || '',
    cta: step?.cta || defaultCta,
    ctaLabel: step?.ctaLabel || 'Open activity',
    minutes: atLeast1(Math.round(step?.minutes || 3)),
});

const toRunnerStep = (step, index) => ({
    ...toStepBase({
        step,
        index,
        stepPrefix: 'runner-step',
        defaultCta: step?.target || 'view-games',
    }),
    status: step?.status || 'not_started',
    source: step?.source || 'plan',
});

const toLessonRunnerStep = (step, index, recommendedGameId) => ({
    ...toStepBase({
        step,
        index,
        stepPrefix: 'lesson-step',
        defaultCta: recommendedGameId,
    }),
    status: 'not_started',
    source: 'plan',
});

/** Converts persisted mission steps into the runner step shape used by the coach. */
/** Maps mission steps into lesson runner step objects. */
export const mapMissionRunnerSteps = (missionSteps = []) => missionSteps.map(toRunnerStep);

/** Converts lesson recommendation steps into fresh runner steps with default CTAs. */
/** Maps lesson plan steps into lesson runner step objects. */
export const mapLessonRunnerSteps = (lessonSteps = [], recommendedGameId = 'view-games') => lessonSteps
    .map((step, index) => toLessonRunnerStep(step, index, recommendedGameId));

/** Derives the current runner cursor and completed-step count from runner steps. */
/** Derives the current runner index and completed count from runner steps. */
export const deriveRunnerPosition = (steps = []) => {
    const completedSteps = steps.filter((step) => step.status === 'complete').length;
    const current = steps.find((step) => step.status === 'in_progress')
        || steps.find((step) => step.status === 'not_started')
        || steps[Math.max(0, steps.length - 1)]
        || null;
    const currentIndex = current ? Math.max(0, steps.findIndex((step) => step.id === current.id)) : 0;
    return {
        completedSteps,
        currentIndex,
    };
};

/** Resets runner steps back to their not-started state while preserving metadata. */
/** Resets runner step statuses and timestamps to their initial state. */
export const resetRunnerSteps = (steps = []) => steps.map((step) => ({
    ...step,
    status: 'not_started',
    startedAt: null,
    completedAt: null,
}));

/** Marks one runner step in progress and clears any previous in-progress marker. */
/** Marks one runner step in progress and clears any previous in-progress step. */
export const markRunnerStepInProgress = (steps = [], stepId, startedAt = Date.now()) => steps.map((step) => {
    if (step.id === stepId) {
        return {
            ...step,
            status: 'in_progress',
            startedAt,
        };
    }
    if (step.status === 'in_progress') {
        return {
            ...step,
            status: 'not_started',
        };
    }
    return step;
});

/** Marks the matching runner step complete and stamps its completion time. */
/** Marks a runner step complete and records its completion time. */
export const markRunnerStepComplete = (steps = [], stepId, completedAt = Date.now()) => steps.map((step) => (
    step.id === stepId
        ? { ...step, status: 'complete', completedAt }
        : step
));
