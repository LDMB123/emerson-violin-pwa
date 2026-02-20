export const toRunnerStep = (step, index) => ({
    id: step?.id || `runner-step-${index + 1}`,
    label: step?.label || `Practice step ${index + 1}`,
    cue: step?.cue || '',
    cta: step?.cta || step?.target || 'view-games',
    ctaLabel: step?.ctaLabel || 'Open activity',
    minutes: Math.max(1, Math.round(step?.minutes || 3)),
    status: step?.status || 'not_started',
    source: step?.source || 'plan',
});

export const toLessonRunnerStep = (step, index, recommendedGameId) => ({
    id: step?.id || `lesson-step-${index + 1}`,
    label: step?.label || `Practice step ${index + 1}`,
    cue: step?.cue || '',
    cta: step?.cta || recommendedGameId,
    ctaLabel: step?.ctaLabel || 'Open activity',
    minutes: Math.max(1, Math.round(step?.minutes || 3)),
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
