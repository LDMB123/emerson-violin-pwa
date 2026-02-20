import { LESSON_STEP } from '../utils/event-names.js';

export const markRunnerGoalComplete = (stepId) => {
    if (!stepId) return;
    const input = document.getElementById(stepId)
        || document.querySelector(`#view-coach [data-goal-list] input[data-step-id="${stepId}"]`);
    if (!(input instanceof HTMLInputElement)) return;
    if (input.checked) return;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
};

export const dispatchLessonRunnerEvent = ({ state, step, index, total }) => {
    document.dispatchEvent(new CustomEvent(LESSON_STEP, {
        detail: {
            state,
            step,
            index,
            total,
        },
    }));
};

export const dispatchPracticeRunnerEvent = ({ eventName, step, index, total }) => {
    document.dispatchEvent(new CustomEvent(eventName, {
        detail: {
            step,
            index,
            total,
            missionStepId: step?.id || null,
            timestamp: Date.now(),
        },
    }));
};
