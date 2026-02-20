export const resolveMissionGoalInputs = () => (
    Array.from(document.querySelectorAll('#view-coach [data-goal-list] input[type="checkbox"][id]'))
);

export const computeMissionProgressValues = ({
    missionState,
    goalInputs,
    goalSlotIds,
}) => {
    if (goalInputs.length) {
        const total = Math.max(goalInputs.length, goalSlotIds.length);
        const completed = goalInputs.filter((input) => input.checked).length;
        return {
            completed,
            total,
            complete: total > 0 && completed >= total,
        };
    }

    if (!missionState?.steps?.length) {
        return {
            completed: 0,
            total: 0,
            complete: false,
        };
    }
    const total = missionState.steps.length;
    const completed = missionState.steps.filter((step) => step.status === 'complete').length;
    return {
        completed,
        total,
        complete: total > 0 && completed >= total,
    };
};

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
    if (!input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
};

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
