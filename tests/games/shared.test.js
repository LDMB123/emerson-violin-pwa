import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ML_RESET } from '../../src/utils/event-names.js';

const adaptiveMocks = vi.hoisted(() => ({
    getGameTuning: vi.fn(async () => ({ difficulty: 'medium', speed: 1, complexity: 1 })),
    updateGameResult: vi.fn(async () => ({ difficulty: 'hard', speed: 1.1, complexity: 2 })),
}));

vi.mock('../../src/ml/adaptive-engine.js', () => adaptiveMocks);
vi.mock('../../src/audio/tone-player.js', () => ({ createTonePlayer: vi.fn(() => null) }));
vi.mock('../../src/persistence/storage.js', () => ({
    getJSON: vi.fn(async () => []),
    setJSON: vi.fn(async () => {}),
}));
vi.mock('../../src/utils/sound-state.js', () => ({ isSoundEnabled: vi.fn(() => true) }));
vi.mock('../../src/utils/math.js', () => ({ todayDay: vi.fn(() => 1) }));
vi.mock('../../src/tuner/tuner-utils.js', () => ({ formatDifficulty: vi.fn((value) => String(value)) }));
vi.mock('../../src/persistence/storage-keys.js', () => ({ EVENTS_KEY: 'events' }));

import { attachTuning } from '../../src/games/shared.js';

const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('attachTuning', () => {
    beforeEach(() => {
        adaptiveMocks.getGameTuning.mockClear();
        adaptiveMocks.updateGameResult.mockClear();
    });

    it('removes ML_RESET listener on dispose', async () => {
        const onUpdate = vi.fn();
        const report = attachTuning('pitch-quest', onUpdate);

        await flushPromises();
        expect(adaptiveMocks.getGameTuning).toHaveBeenCalledTimes(1);

        document.dispatchEvent(new Event(ML_RESET));
        await flushPromises();
        expect(adaptiveMocks.getGameTuning).toHaveBeenCalledTimes(2);

        report.dispose();
        document.dispatchEvent(new Event(ML_RESET));
        await flushPromises();
        expect(adaptiveMocks.getGameTuning).toHaveBeenCalledTimes(2);
    });

    it('applies updated tuning after reporting result', async () => {
        const onUpdate = vi.fn();
        const report = attachTuning('ear-trainer', onUpdate);
        await flushPromises();
        onUpdate.mockClear();

        await report({ score: 10, accuracy: 80 });

        expect(adaptiveMocks.updateGameResult).toHaveBeenCalledWith('ear-trainer', { score: 10, accuracy: 80 });
        expect(onUpdate).toHaveBeenCalledWith({ difficulty: 'hard', speed: 1.1, complexity: 2 });

        report.dispose();
    });
});
