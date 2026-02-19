import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CURRICULUM_STATE_KEY, MISSION_HISTORY_KEY } from '../../src/persistence/storage-keys.js';

const testState = vi.hoisted(() => ({
    store: new Map(),
    events: [],
    content: {
        id: 'test-track',
        version: 1,
        tiers: ['beginner', 'intermediate'],
        masteryThresholds: { bronze: 60, silver: 80, gold: 92, distinctDays: 3 },
        units: [
            {
                id: 'u-beg-01',
                tier: 'beginner',
                order: 1,
                title: 'Unit 1',
                requiredObjectives: {
                    practiceMinutes: 10,
                    games: ['pitch-quest'],
                    songs: ['twinkle'],
                },
                missionTemplate: {
                    steps: [
                        { id: 'step-1', type: 'game', label: 'Pitch Quest', target: 'pitch-quest:foundation' },
                        { id: 'step-2', type: 'song', label: 'Twinkle A', target: 'twinkle:section-a' },
                        { id: 'step-3', type: 'review', label: 'Reflect', target: 'self-check' },
                    ],
                    remediation: {
                        rhythm: [
                            { id: 'rem-rhythm', type: 'game', label: 'Rhythm reset', target: 'rhythm-dash:foundation' },
                        ],
                    },
                },
            },
            {
                id: 'u-beg-02',
                tier: 'beginner',
                order: 2,
                title: 'Unit 2',
                requiredObjectives: {
                    practiceMinutes: 12,
                    games: ['rhythm-dash'],
                    songs: ['mary'],
                },
                missionTemplate: {
                    steps: [
                        { id: 'step-a', type: 'game', label: 'Rhythm Dash', target: 'rhythm-dash:foundation' },
                        { id: 'step-b', type: 'song', label: 'Mary', target: 'mary:section-a' },
                        { id: 'step-c', type: 'review', label: 'Reflect', target: 'self-check' },
                    ],
                    remediation: {
                        rhythm: [
                            { id: 'rem-rhythm-2', type: 'game', label: 'Rhythm retry', target: 'rhythm-dash:core' },
                        ],
                    },
                },
            },
        ],
    },
}));

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async (key) => testState.store.get(key) ?? null),
    setJSON: vi.fn(async (key, value) => {
        testState.store.set(key, value);
    }),
}));

const loaderMocks = vi.hoisted(() => ({
    loadEvents: vi.fn(async () => testState.events),
}));

const contentMocks = vi.hoisted(() => ({
    getCurriculumContent: vi.fn(async () => testState.content),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);
vi.mock('../../src/persistence/loaders.js', () => loaderMocks);
vi.mock('../../src/curriculum/content-loader.js', () => contentMocks);

import { ensureCurrentMission } from '../../src/curriculum/engine.js';
import { clearCurriculumState, loadCurriculumState } from '../../src/curriculum/state.js';

describe('curriculum/engine', () => {
    beforeEach(async () => {
        testState.store.clear();
        testState.events = [];
        storageMocks.getJSON.mockClear();
        storageMocks.setJSON.mockClear();
        loaderMocks.loadEvents.mockClear();
        contentMocks.getCurriculumContent.mockClear();
        await clearCurriculumState();
    });

    it('creates deterministic first mission for first-time users', async () => {
        const result = await ensureCurrentMission({
            recommendations: { weakestSkill: 'pitch' },
            events: [],
        });

        expect(result.mission).toBeTruthy();
        expect(result.mission.unitId).toBe('u-beg-01');
        expect(result.mission.phase).toBe('onramp');
        expect(result.mission.steps[0].status).toBe('not_started');

        const saved = await loadCurriculumState();
        expect(saved.activeMissionId).toBe(result.mission.id);
        expect(saved.currentUnitId).toBe('u-beg-01');
    });

    it('advances mission unit for progressing users', async () => {
        const now = Date.now();
        testState.events = [
            { type: 'practice', id: 'p1', minutes: 12, day: 3, timestamp: now - 4000 },
            { type: 'game', id: 'pitch-quest', accuracy: 88, day: 3, timestamp: now - 3000 },
            { type: 'song', id: 'twinkle', accuracy: 91, day: 3, timestamp: now - 2000 },
        ];

        const result = await ensureCurrentMission({
            recommendations: { weakestSkill: 'reading' },
            events: testState.events,
        });

        expect(result.flow).toBe('progressing');
        expect(result.mission.unitId).toBe('u-beg-02');
        expect(result.mission.phase).toBe('advance');
    });

    it('regresses and inserts remediation for struggling users', async () => {
        testState.store.set(CURRICULUM_STATE_KEY, {
            version: 1,
            currentUnitId: 'u-beg-02',
            activeMissionId: null,
            currentMission: null,
            completedUnitIds: [],
            unitProgress: {},
            lastUpdatedAt: Date.now(),
        });
        testState.store.set(MISSION_HISTORY_KEY, []);

        const now = Date.now();
        testState.events = [
            { type: 'game', id: 'rhythm-dash', accuracy: 50, day: 4, timestamp: now - 1000 },
        ];

        const result = await ensureCurrentMission({
            recommendations: { weakestSkill: 'rhythm' },
            events: testState.events,
            forceRegenerate: true,
        });

        expect(result.flow).toBe('regressing');
        expect(result.mission.unitId).toBe('u-beg-01');
        expect(result.mission.phase).toBe('remediation');
        expect(result.mission.steps.some((step) => step.source === 'remediation')).toBe(true);
    });
});
