import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    GAME_RECORDED,
    ML_RECS,
    ML_UPDATE,
    PRACTICE_RECORDED,
    SONG_RECORDED,
} from '../../src/utils/event-names.js';
import { setupModuleImportDomTest, teardownModuleImportDomTest } from '../utils/test-listener-capture.js';
import { setDocumentVisibility } from '../utils/test-lifecycle-mocks.js';

const recommendationMocks = vi.hoisted(() => ({
    refreshRecommendationsCache: vi.fn(async () => ({ recommendedGameId: 'pitch-quest' })),
}));

const idleTaskMocks = vi.hoisted(() => ({
    scheduleBackgroundTask: vi.fn(async (task) => {
        await task();
    }),
}));

vi.mock('../../src/ml/recommendations.js', () => recommendationMocks);
vi.mock('../../src/utils/idle-task.js', () => idleTaskMocks);

const flushBackgroundWork = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const advanceClock = (value) => {
    vi.setSystemTime(Date.now() + value);
};

describe('ml/offline-scheduler', () => {
    let captures;
    let emittedReasons;

    beforeEach(() => {
        captures = setupModuleImportDomTest({
            captureWindow: true,
            setupState: () => {
                vi.setSystemTime(1_000_000);
                setDocumentVisibility('visible');
                Object.defineProperty(navigator, 'deviceMemory', {
                    configurable: true,
                    value: 8,
                });
            },
        });
        recommendationMocks.refreshRecommendationsCache.mockClear();
        idleTaskMocks.scheduleBackgroundTask.mockClear();
        emittedReasons = [];
        document.addEventListener(ML_RECS, (event) => {
            emittedReasons.push(event.detail.reason);
        });
    });

    afterEach(() => {
        teardownModuleImportDomTest(captures);
    });

    it('refreshes recommendations for boot and each tracked event reason', async () => {
        await import('../../src/ml/offline-scheduler.js');
        await flushBackgroundWork();

        expect(recommendationMocks.refreshRecommendationsCache).toHaveBeenCalledTimes(1);
        expect(emittedReasons).toEqual(['boot']);

        for (const [eventName] of [
            [GAME_RECORDED, 'game'],
            [PRACTICE_RECORDED, 'practice'],
            [SONG_RECORDED, 'song'],
            [ML_UPDATE, 'adaptive'],
        ]) {
            advanceClock(10 * 60 * 1000);
            document.dispatchEvent(new Event(eventName));
            await flushBackgroundWork();
        }

        expect(recommendationMocks.refreshRecommendationsCache).toHaveBeenCalledTimes(5);
        expect(emittedReasons).toEqual([
            'boot',
            'game',
            'practice',
            'song',
            'adaptive',
        ]);
    });

    it('ignores hidden refreshes and resumes on visible and online events', async () => {
        await import('../../src/ml/offline-scheduler.js');
        await flushBackgroundWork();

        setDocumentVisibility('hidden');
        advanceClock(10 * 60 * 1000);
        window.dispatchEvent(new Event('online'));
        await flushBackgroundWork();

        expect(recommendationMocks.refreshRecommendationsCache).toHaveBeenCalledTimes(1);
        expect(emittedReasons).toEqual(['boot']);

        setDocumentVisibility('visible');
        advanceClock(10 * 60 * 1000);
        document.dispatchEvent(new Event('visibilitychange'));
        await flushBackgroundWork();

        advanceClock(10 * 60 * 1000);
        window.dispatchEvent(new Event('online'));
        await flushBackgroundWork();

        expect(recommendationMocks.refreshRecommendationsCache).toHaveBeenCalledTimes(3);
        expect(emittedReasons).toEqual(['boot', 'visible', 'online']);
    });
});
