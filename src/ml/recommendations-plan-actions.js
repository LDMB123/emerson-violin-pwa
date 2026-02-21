import { SKILL_LABELS } from '../utils/recommendations-utils.js';
import { toViewId } from '../utils/lesson-plan-utils.js';



export const buildMissionContract = (mission) => {
    if (!mission) {
        return {
            id: null,
            phase: 'core',
            steps: [],
            currentStepId: null,
            remediationStepIds: [],
            completionPercent: 0,
            unitId: null,
            status: 'idle',
        };
    }

    return {
        id: mission.id,
        phase: mission.phase || 'core',
        steps: Array.isArray(mission.steps)
            ? mission.steps.map((step) => ({
                id: step.id,
                type: step.type,
                label: step.label,
                target: step.target,
                status: step.status,
                source: step.source || 'plan',
            }))
            : [],
        currentStepId: mission.currentStepId || null,
        remediationStepIds: Array.isArray(mission.remediationStepIds) ? mission.remediationStepIds : [],
        completionPercent: Number.isFinite(mission.completionPercent) ? mission.completionPercent : 0,
        unitId: mission.unitId || null,
        tier: mission.tier || null,
        status: mission.status || 'active',
    };
};

const getCurrentMissionStep = (mission) => {
    if (!mission?.steps?.length) return null;
    const candidates = [
        (step) => step.id === mission.currentStepId,
        (step) => step.status === 'in_progress',
        (step) => step.status === 'not_started',
    ];
    for (const matcher of candidates) {
        const found = mission.steps.find(matcher);
        if (found) return found;
    }
    return mission.steps[mission.steps.length - 1] || null;
};

const resolveMissionStepHref = (missionStep) => {
    if (!missionStep) return '#view-coach';
    if (missionStep.type === 'song') return '#view-songs';
    if (missionStep.type === 'tuner') return '#view-tuner';
    if (missionStep.target?.startsWith('view-')) return `#${missionStep.target}`;
    if (missionStep.target?.includes(':')) return `#view-game-${missionStep.target.split(':')[0]}`;
    return '#view-coach';
};

export const buildNextActions = ({
    mission,
    recommendedGameId,
    recommendedGameLabel,
    weakestSkill,
    songLevel,
    dueReviewAction,
}) => {
    const actions = [];

    if (dueReviewAction) {
        actions.push(dueReviewAction);
    }

    const missionStep = getCurrentMissionStep(mission);
    if (missionStep) {
        actions.push({
            id: 'resume-mission-step',
            label: `Resume: ${missionStep.label || 'Mission step'}`,
            href: resolveMissionStepHref(missionStep),
            rationale: `Current mission step (${mission.phase || 'core'} phase).`,
        });
    }

    if (recommendedGameId) {
        actions.push({
            id: 'recommended-game',
            label: `Play ${recommendedGameLabel || 'recommended game'}`,
            href: `#${toViewId(recommendedGameId)}`,
            rationale: `${SKILL_LABELS[weakestSkill] || 'Core'} is your weakest skill right now.`,
        });
    }

    actions.push({
        id: 'recommended-song',
        label: `Practice a ${songLevel || 'beginner'} song`,
        href: '#view-songs',
        rationale: 'Song work closes the loop on tone, rhythm, and reading.',
    });

    return actions.slice(0, 3);
};
