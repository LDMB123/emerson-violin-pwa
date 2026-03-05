import { beforeEach, describe, expect, it, vi } from 'vitest';

const stateMocks = vi.hoisted(() => ({
    appendMissionHistory: vi.fn(async () => []),
    loadCurriculumState: vi.fn(async () => ({ loaded: true })),
    normalizeMission: vi.fn((mission) => mission || null),
    updateMission: vi.fn((mission, updates = {}) => ({
        ...mission,
        ...updates,
    })),
    MISSION_STEP_STATES: {
        NOT_STARTED: 'not_started',
        IN_PROGRESS: 'in_progress',
        COMPLETE: 'complete',
    },
}));

const persistenceMocks = vi.hoisted(() => ({
    saveMissionState: vi.fn(async ({ state, mission }) => ({
        ...(state || {}),
        currentMission: mission,
    })),
}));

vi.mock('../../src/curriculum/state.js', () => stateMocks);
vi.mock('../../src/curriculum/engine-mission-persistence.js', () => persistenceMocks);

import {
    completeMissionStep,
    insertRemediationForSkill,
    startMissionStep,
} from '../../src/curriculum/engine-mission.js';

const createMission = () => ({
    id: 'mission-1',
    unitId: 'u-beg-01',
    currentStepId: 'step-1',
    steps: [
        { id: 'step-1', status: 'in_progress' },
        { id: 'step-2', status: 'not_started' },
    ],
});

describe('curriculum/engine-mission', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    });

    it('completes a mission step and persists mission history', async () => {
        const mission = createMission();
        const result = await completeMissionStep({
            stepId: 'step-1',
            mission,
            unit: { id: mission.unitId },
            state: { session: 'state' },
        });

        expect(result.mission.steps[0].status).toBe('complete');
        expect(result.mission.currentStepId).toBe('step-2');
        expect(result.mission.completionPercent).toBe(50);
        expect(result.mission.status).toBe('active');
        expect(persistenceMocks.saveMissionState).toHaveBeenCalledTimes(1);
        expect(stateMocks.appendMissionHistory).toHaveBeenCalledWith(
            expect.objectContaining({ reason: 'step-complete' }),
        );
    });

    it('starts a mission step and resets previous in-progress step', async () => {
        const mission = createMission();
        const result = await startMissionStep({
            stepId: 'step-2',
            mission,
            unit: { id: mission.unitId },
            state: { session: 'state' },
        });

        expect(result.mission.steps[0].status).toBe('not_started');
        expect(result.mission.steps[1].status).toBe('in_progress');
        expect(result.mission.currentStepId).toBe('step-2');
        expect(stateMocks.appendMissionHistory).toHaveBeenCalledWith(
            expect.objectContaining({ reason: 'step-start' }),
        );
    });

    it('returns normalized mission and loaded state when remediation input is incomplete', async () => {
        const mission = createMission();
        const result = await insertRemediationForSkill({
            mission,
            unit: null,
            skill: 'pitch',
        });

        expect(result).toEqual({
            mission,
            state: { loaded: true },
        });
        expect(stateMocks.loadCurriculumState).toHaveBeenCalledTimes(1);
        expect(persistenceMocks.saveMissionState).toHaveBeenCalledTimes(0);
    });

    it('inserts remediation steps and persists updated mission', async () => {
        const mission = createMission();
        const unit = {
            id: 'u-beg-01',
            missionTemplate: {
                remediation: {
                    pitch: [
                        { id: 'pitch-1', label: 'Pitch reset', target: 'view-game-pitch-quest' },
                    ],
                },
            },
        };

        const result = await insertRemediationForSkill({
            mission,
            unit,
            skill: 'pitch',
            state: { session: 'state' },
        });

        expect(result.mission.steps.length).toBe(3);
        expect(result.mission.steps[1].source).toBe('remediation');
        expect(result.mission.remediationStepIds.length).toBe(1);
        expect(persistenceMocks.saveMissionState).toHaveBeenCalledTimes(1);
        expect(stateMocks.appendMissionHistory).toHaveBeenCalledWith(
            expect.objectContaining({ reason: 'remediation:pitch' }),
        );
    });
});
