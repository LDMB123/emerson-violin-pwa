import { LESSON_STEP, emitEvent } from '../utils/event-names.js';
import { markCheckboxInputChecked } from '../utils/checkbox-utils.js';

/** Marks the matching coach goal checkbox complete for a lesson runner step. */
export const markRunnerGoalComplete = (stepId) => {
    if (!stepId) return;
    const input = document.getElementById(stepId)
        || document.querySelector(`#view-coach [data-goal-list] input[data-step-id="${stepId}"]`);
    markCheckboxInputChecked(input);
};

/** Emits the lesson runner progress event for analytics and UI listeners. */
export const dispatchLessonRunnerEvent = ({ state, step, index, total }) => {
    emitEvent(LESSON_STEP, {
        state,
        step,
        index,
        total,
    });
};

/** Emits a practice-domain runner event tied to the current mission step. */
export const dispatchPracticeRunnerEvent = ({ eventName, step, index, total }) => {
    emitEvent(eventName, {
        step,
        index,
        total,
        missionStepId: step?.id || null,
        timestamp: Date.now(),
    });
};
