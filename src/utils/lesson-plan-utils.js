/**
 * Normalizes a lesson target into a concrete view ID.
 * Bare game IDs are promoted to `view-game-*`; missing values fall back to `view-games`.
 *
 * @param {string | null | undefined} id
 * @returns {string}
 */
export const toViewId = (id) => {
    if (!id) return 'view-games';
    if (id.startsWith('view-')) return id;
    return `view-game-${id}`;
};

/**
 * Builds a hash link for a normalized lesson target.
 *
 * @param {string | null | undefined} id
 * @returns {string}
 */
export const toLessonLink = (id) => `#${toViewId(id)}`;

/**
 * Converts a lesson step length from minutes to seconds with a 30-second floor.
 *
 * @param {number | null | undefined} minutes
 * @returns {number}
 */
export const computeStepDuration = (minutes) => {
    return Math.max(30, Math.round((minutes || 1) * 60));
};

/**
 * Computes normalized progress for the active lesson step.
 * Inactive steps always report zero progress.
 *
 * @param {number} duration
 * @param {number} remainingSeconds
 * @param {boolean} isActive
 * @returns {number}
 */
export const computeStepProgress = (duration, remainingSeconds, isActive) => {
    if (!isActive) return 0;
    return Math.max(0, Math.min(1, (duration - remainingSeconds) / duration));
};

/**
 * Computes normalized overall lesson progress across completed and active steps.
 *
 * @param {number} completedSteps
 * @param {number} stepProgress
 * @param {number} totalSteps
 * @returns {number}
 */
export const computeOverallProgress = (completedSteps, stepProgress, totalSteps) => {
    if (!totalSteps) return 0;
    return Math.min(1, (completedSteps + stepProgress) / totalSteps);
};

/**
 * Formats the runner label for the current lesson step.
 *
 * @param {number} currentIndex
 * @param {number} totalSteps
 * @returns {string}
 */
export const formatStepLabel = (currentIndex, totalSteps) => {
    if (!totalSteps) return 'No lesson plan yet';
    return `Step ${Math.min(currentIndex + 1, totalSteps)} of ${totalSteps}`;
};

/**
 * Formats the lesson cue shown beside the active step.
 *
 * @param {{ label?: string, cue?: string } | null | undefined} step
 * @returns {string}
 */
export const formatStepCue = (step) => {
    if (!step?.label) return 'Tap Start to begin.';
    return step.cue ? `${step.label} · ${step.cue}` : step.label;
};
