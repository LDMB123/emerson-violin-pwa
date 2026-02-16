export const toLessonLink = (id) => {
    if (!id) return '#view-games';
    if (id.startsWith('view-')) return `#${id}`;
    return `#view-game-${id}`;
};

export const computeStepDuration = (minutes) => {
    return Math.max(30, Math.round((minutes || 1) * 60));
};

export const computeStepProgress = (duration, remainingSeconds, isActive) => {
    if (!isActive) return 0;
    return Math.max(0, Math.min(1, (duration - remainingSeconds) / duration));
};

export const computeOverallProgress = (completedSteps, stepProgress, totalSteps) => {
    if (!totalSteps) return 0;
    return Math.min(1, (completedSteps + stepProgress) / totalSteps);
};

export const formatStepLabel = (currentIndex, totalSteps) => {
    if (!totalSteps) return 'No lesson plan yet';
    return `Step ${Math.min(currentIndex + 1, totalSteps)} of ${totalSteps}`;
};

export const formatStepCue = (step) => {
    if (!step?.label) return 'Tap Start to begin.';
    return step.cue ? `${step.label} · ${step.cue}` : step.label;
};

export const shouldResetLesson = (completedSteps, totalSteps) => {
    return completedSteps >= totalSteps;
};

export const getNextStepIndex = (currentIndex, completedSteps, totalSteps) => {
    if (completedSteps >= totalSteps) return 0;
    return completedSteps;
};

export const canAdvanceStep = (completedSteps, totalSteps) => {
    return completedSteps < totalSteps;
};
