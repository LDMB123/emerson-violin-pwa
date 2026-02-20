import { getCurriculumSnapshot } from './engine-flow.js';
import { ensurePersistedMission } from './engine-mission-persistence.js';
import {
    completeMissionStep,
    insertRemediationForSkill,
    startMissionStep,
} from './engine-mission.js';

export { completeMissionStep, insertRemediationForSkill, startMissionStep };

export const ensureCurrentMission = async ({
    recommendations,
    events,
    forceRegenerate = false,
} = {}) => {
    const snapshot = await getCurriculumSnapshot({ events });
    const { mission, persistedState } = await ensurePersistedMission({
        snapshot,
        recommendations,
        forceRegenerate,
    });

    return {
        ...snapshot,
        mission,
        persistedState,
    };
};
