import { markCheckboxInputChecked } from '../utils/checkbox-utils.js';

/** Returns the coach goal checkboxes currently rendered in the active goal list. */
export const resolveMissionGoalInputs = () => (
    Array.from(document.querySelectorAll('#view-coach [data-goal-list] input[type="checkbox"][id]'))
);

const buildMissionProgress = (completed, total) => ({
    completed,
    total,
    complete: total > 0 && completed >= total,
});

const countBy = (collection, predicate) => (
    Array.isArray(collection) ? collection.filter(predicate).length : 0
);

/** Computes completed/total mission progress from either inputs or mission state. */
export const computeMissionProgressValues = ({
    missionState,
    goalInputs,
    goalSlotIds,
}) => {
    if (goalInputs.length) {
        const total = Math.max(goalInputs.length, goalSlotIds.length);
        const completed = countBy(goalInputs, (input) => input.checked);
        return buildMissionProgress(completed, total);
    }

    if (!missionState?.steps?.length) {
        return {
            completed: 0,
            total: 0,
            complete: false,
        };
    }
    const total = missionState.steps.length;
    const completed = countBy(missionState.steps, (step) => step.status === 'complete');
    return buildMissionProgress(completed, total);
};

/** Re-renders the coach goal list while preserving any preexisting checked state. */
export const applyMissionGoalList = ({
    missionState,
    goalSlotIds,
    goalSlotDefaults,
    renderMissionGoalList,
}) => {
    const goalList = document.querySelector('#view-coach [data-goal-list]');
    if (!goalList) return false;
    const previousChecked = new Map(
        resolveMissionGoalInputs().map((input) => [input.id, Boolean(input.checked)]),
    );
    renderMissionGoalList({
        goalList,
        missionState,
        goalSlotIds,
        goalSlotDefaults,
        previousChecked,
    });
    return true;
};

const isCoachViewActive = () => {
    const coachView = document.getElementById('view-coach');
    if (!coachView) return false;
    return coachView.classList.contains('is-active') && !coachView.hasAttribute('hidden');
};

const getMissionStepIdForGoal = ({ goalId, goalSlotIds, missionState }) => {
    if (!goalId) return null;
    const goalIndex = goalSlotIds.indexOf(goalId);
    if (goalIndex < 0) return null;
    return missionState?.steps?.[goalIndex]?.id || null;
};

/** Marks a mission goal complete immediately or queues it if the UI is unavailable. */
export const markMissionGoal = ({
    goalId,
    goalSlotIds,
    missionState,
    queueGoal,
    queueIfMissing = true,
}) => {
    if (!goalId) return false;
    const input = document.getElementById(goalId);
    if (!(input instanceof HTMLInputElement) || !isCoachViewActive()) {
        if (queueIfMissing) queueGoal(goalId);
        return false;
    }
    const stepId = input.dataset.stepId || getMissionStepIdForGoal({ goalId, goalSlotIds, missionState });
    if (stepId && !input.dataset.stepId) {
        input.dataset.stepId = stepId;
    }
    return markCheckboxInputChecked(input) || input.checked;
};

/** Replays queued goal completions against the live coach goal list. */
export const flushQueuedMissionGoals = ({
    readQueuedGoals,
    writeQueuedGoals,
    markGoal,
}) => {
    const queued = readQueuedGoals();
    if (!queued.length) return;

    const remaining = [];
    queued.forEach((goalId) => {
        const applied = markGoal(goalId, { queueIfMissing: false });
        if (!applied) remaining.push(goalId);
    });
    writeQueuedGoals(remaining);
};
