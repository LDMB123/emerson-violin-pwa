import {
    PRACTICE_STEP_COMPLETED,
    PRACTICE_STEP_STARTED,
} from '../utils/event-names.js';

export const createMissionProgressHandlers = ({
    missionContext,
    applyMissionResult,
    updateMissionStatus,
    markGoal,
    completeMissionStep,
    startMissionStep,
    insertRemediationForSkill,
}) => {
    const updateMissionStep = async ({ stepId, type }) => {
        if (!missionContext.mission?.id || !stepId) return;

        const handler = type === 'start' ? startMissionStep : completeMissionStep;
        const result = await handler({
            stepId,
            mission: missionContext.mission,
            unit: missionContext.unit,
        });

        applyMissionResult(result);
    };

    const maybeInsertRemediation = async (event) => {
        const score = Number.isFinite(event?.detail?.accuracy)
            ? event.detail.accuracy
            : event?.detail?.score;

        if (!Number.isFinite(score) || score >= 60) return;
        if (!missionContext.mission?.id || !missionContext.unit) return;

        const result = await insertRemediationForSkill({
            mission: missionContext.mission,
            unit: missionContext.unit,
            skill: missionContext.weakestSkill || 'pitch',
        });

        applyMissionResult(result);
    };

    const handleGoalFromActivity = (goalId) => {
        if (!goalId) return;
        markGoal(goalId);
        updateMissionStatus();
    };

    const dispatchPracticeStepEvent = (eventName, stepId) => {
        document.dispatchEvent(new CustomEvent(eventName, {
            detail: {
                missionId: missionContext.mission?.id,
                stepId,
                timestamp: Date.now(),
            },
        }));
    };

    const handleLessonStep = async (event) => {
        const stepId = event?.detail?.step?.id;
        const state = event?.detail?.state;
        if (!stepId || !state) return;

        if (state === 'start') {
            await updateMissionStep({ stepId, type: 'start' });
            dispatchPracticeStepEvent(PRACTICE_STEP_STARTED, stepId);
        }

        if (state === 'complete') {
            await updateMissionStep({ stepId, type: 'complete' });
            dispatchPracticeStepEvent(PRACTICE_STEP_COMPLETED, stepId);
        }
    };

    return {
        updateMissionStep,
        maybeInsertRemediation,
        handleGoalFromActivity,
        handleLessonStep,
    };
};
