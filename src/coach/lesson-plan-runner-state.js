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

export const mapMissionRunnerSteps = (missionSteps = []) => missionSteps.map(toRunnerStep);

export const mapLessonRunnerSteps = (lessonSteps = [], recommendedGameId = 'view-games') => lessonSteps
    .map((step, index) => toLessonRunnerStep(step, index, recommendedGameId));

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

export const resetRunnerSteps = (steps = []) => steps.map((step) => ({
    ...step,
    status: 'not_started',
    startedAt: null,
    completedAt: null,
}));

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

export const markRunnerStepComplete = (steps = [], stepId, completedAt = Date.now()) => steps.map((step) => (
    step.id === stepId
        ? { ...step, status: 'complete', completedAt }
        : step
));
