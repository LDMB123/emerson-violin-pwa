import { LESSON_STEP, emitEvent } from '../utils/event-names.js';
import { markCheckboxInputChecked } from '../utils/checkbox-utils.js';

export const markRunnerGoalComplete = (stepId) => {
    if (!stepId) return;
    const input = document.getElementById(stepId)
        || document.querySelector(`#view-coach [data-goal-list] input[data-step-id="${stepId}"]`);
    markCheckboxInputChecked(input);
};

export const dispatchLessonRunnerEvent = ({ state, step, index, total }) => {
    emitEvent(LESSON_STEP, {
        state,
        step,
        index,
        total,
    });
};

export const dispatchPracticeRunnerEvent = ({ eventName, step, index, total }) => {
    emitEvent(eventName, {
        step,
        index,
        total,
        missionStepId: step?.id || null,
        timestamp: Date.now(),
    });
};
