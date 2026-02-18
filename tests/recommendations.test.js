import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    cache: null,
    events: [],
    adaptiveLog: [],
    tuning: { targetBpm: 90 },
    tuningFails: false,
}));

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async (key) => {
        if (key === 'panda-violin:ml:recs-v1') return state.cache;
        return null;
    }),
    setJSON: vi.fn(async () => {}),
}));

const loaderMocks = vi.hoisted(() => ({
    loadEvents: vi.fn(async () => state.events),
}));

const adaptiveMocks = vi.hoisted(() => ({
    getAdaptiveLog: vi.fn(async () => state.adaptiveLog),
    getGameTuning: vi.fn(async () => {
        if (state.tuningFails) {
            throw new Error('tuning unavailable');
        }
        return state.tuning;
    }),
}));

vi.mock('../src/persistence/storage.js', () => storageMocks);
vi.mock('../src/persistence/loaders.js', () => loaderMocks);
vi.mock('../src/ml/adaptive-engine.js', () => adaptiveMocks);

import {
    getLearningRecommendations,
    refreshRecommendationsCache,
} from '../src/ml/recommendations.js';

const waitForAsyncWork = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('learning recommendations', () => {
    beforeEach(() => {
        storageMocks.getJSON.mockClear();
        storageMocks.setJSON.mockClear();
        loaderMocks.loadEvents.mockClear();
        adaptiveMocks.getAdaptiveLog.mockClear();
        adaptiveMocks.getGameTuning.mockClear();
        state.cache = null;
        state.tuningFails = false;
        state.tuning = { targetBpm: 88 };
        state.events = [
            { type: 'song', id: 'twinkle', accuracy: 72, timestamp: Date.now() - 2000 },
            { type: 'song', id: 'mary', accuracy: 78, timestamp: Date.now() - 1000 },
        ];
        state.adaptiveLog = [
            { id: 'pitch-quest', accuracy: 55, timestamp: Date.now() - 8000 },
            { id: 'rhythm-dash', accuracy: 80, timestamp: Date.now() - 7000 },
        ];
    });

    it('returns structured lesson plan data', async () => {
        const recs = await getLearningRecommendations({ allowCached: false });
        expect(recs).toBeTruthy();
        expect(recs.recommendedGameId).toBeTruthy();
        expect(recs.lessonSteps?.length).toBe(5);
        expect(recs.lessonTotal).toBeGreaterThan(0);
        expect(recs.metronomeTarget).toBe(88);
        expect(recs.coachMessage.length).toBeGreaterThan(0);
        expect(recs.coachActionMessage).toMatch(/^Start with /);
    });

    it('returns fresh cache directly when available', async () => {
        state.cache = {
            updatedAt: Date.now(),
            recommendations: {
                recommendedGameId: 'rhythm-dash',
                coachMessage: 'cached',
            },
        };

        const recs = await getLearningRecommendations();
        expect(recs).toEqual(state.cache.recommendations);
        expect(loaderMocks.loadEvents).not.toHaveBeenCalled();
        expect(storageMocks.setJSON).not.toHaveBeenCalled();
    });

    it('returns stale cache immediately and refreshes in background', async () => {
        state.cache = {
            updatedAt: Date.now() - (10 * 60 * 1000),
            recommendations: {
                recommendedGameId: 'cached-old',
                coachMessage: 'cached-old',
            },
        };

        const recs = await getLearningRecommendations();
        expect(recs).toEqual(state.cache.recommendations);
        await waitForAsyncWork();
        expect(storageMocks.setJSON).toHaveBeenCalledTimes(1);
    });

    it('recomputes and persists when cache is missing', async () => {
        const recs = await refreshRecommendationsCache();
        expect(recs.recommendedGameId).toBeTruthy();
        expect(storageMocks.setJSON).toHaveBeenCalledTimes(1);
        expect(storageMocks.setJSON.mock.calls[0][0]).toBe('panda-violin:ml:recs-v1');
        expect(storageMocks.setJSON.mock.calls[0][1]).toMatchObject({
            recommendations: expect.any(Object),
            updatedAt: expect.any(Number),
        });
    });

    it('dedupes concurrent refreshes into a single compute/write cycle', async () => {
        const [first, second] = await Promise.all([
            refreshRecommendationsCache(),
            refreshRecommendationsCache(),
        ]);

        expect(first).toEqual(second);
        expect(loaderMocks.loadEvents).toHaveBeenCalledTimes(1);
        expect(adaptiveMocks.getAdaptiveLog).toHaveBeenCalledTimes(1);
        expect(storageMocks.setJSON).toHaveBeenCalledTimes(1);
    });

    it('falls back to default metronome target when tuning fails', async () => {
        state.tuningFails = true;
        const recs = await getLearningRecommendations({ allowCached: false });
        expect(recs.metronomeTarget).toBe(90);
    });

    it('maps weakest reading skill to note memory recommendation', async () => {
        state.adaptiveLog = [
            { id: 'note-memory', accuracy: 40, timestamp: Date.now() - 1000 },
            { id: 'pitch-quest', accuracy: 92, timestamp: Date.now() - 900 },
            { id: 'rhythm-dash', accuracy: 91, timestamp: Date.now() - 800 },
            { id: 'bow-hero', accuracy: 93, timestamp: Date.now() - 700 },
        ];

        const recs = await getLearningRecommendations({ allowCached: false });
        expect(recs.weakestSkill).toBe('reading');
        expect(recs.recommendedGameId).toBe('note-memory');
        expect(recs.skillLabel).toBe('Reading');
    });

    it('escalates song step label for advanced song accuracy history', async () => {
        state.events = Array.from({ length: 8 }).map((_, index) => ({
            type: 'song',
            id: `song-${index}`,
            accuracy: 92,
            timestamp: Date.now() - (index * 1000),
        }));

        const recs = await getLearningRecommendations({ allowCached: false });
        const songStep = recs.lessonSteps[recs.lessonSteps.length - 1];
        expect(recs.songLevel).toBe('advanced');
        expect(songStep.label).toContain('challenge');
    });
});
