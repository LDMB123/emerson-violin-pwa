import { beforeEach, describe, expect, it, vi } from 'vitest';

const renderer = {
    resolveElements: vi.fn(),
    hasRecordingSlots: vi.fn(() => true),
    buildSongMap: vi.fn(() => new Map()),
    getRecordingElements: vi.fn(() => ({})),
    updateChart: vi.fn(),
    updateMinutes: vi.fn(),
    updateAccuracy: vi.fn(),
    updateSkills: vi.fn(),
    setCoachMessage: vi.fn(),
    updateMissionStatus: vi.fn(),
    renderNextActions: vi.fn(),
    setCoachAltMessage: vi.fn(),
};

const recordingController = {
    applyRecordings: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
};

vi.mock('../../src/analysis/session-review-render.js', () => ({
    createSessionReviewRenderer: () => renderer,
}));

vi.mock('../../src/analysis/session-review-recording-controls.js', () => ({
    createSessionReviewRecordingController: () => recordingController,
}));

vi.mock('../../src/wasm/load-core.js', () => ({
    getCore: vi.fn(async () => ({ SkillProfile: class SkillProfile {}, SkillCategory: {} })),
}));

vi.mock('../../src/utils/skill-profile.js', () => ({
    createSkillProfileUtils: vi.fn(() => ({ updateSkillProfile: vi.fn() })),
}));

vi.mock('../../src/analysis/session-review-data.js', () => ({
    buildSessionStats: vi.fn(() => ({ recentAccuracies: [], minutes: 8, accuracyAvg: 92 })),
    buildSkillProfile: vi.fn(() => ({
        weakest_skill: () => ({ id: 'bowing' }),
    })),
}));

vi.mock('../../src/utils/session-review-utils.js', () => ({
    coachMessageFor: vi.fn(() => 'Keep bowing smooth.'),
}));

vi.mock('../../src/ml/recommendations.js', () => ({
    getLearningRecommendations: vi.fn(async () => ({})),
}));

vi.mock('../../src/persistence/loaders.js', () => ({
    loadEvents: vi.fn(async () => []),
    loadRecordings: vi.fn(async () => []),
}));

describe('session-review lifecycle', () => {
    beforeEach(() => {
        recordingController.stop.mockClear();
    });

    it('stops only on non-persisted pagehide', async () => {
        const { init } = await import('../../src/analysis/session-review.js');
        await init();

        window.dispatchEvent(new Event('pagehide'));
        expect(recordingController.stop).toHaveBeenCalledTimes(1);

        const persistedPagehide = new Event('pagehide');
        Object.defineProperty(persistedPagehide, 'persisted', { value: true });
        window.dispatchEvent(persistedPagehide);
        expect(recordingController.stop).toHaveBeenCalledTimes(1);
    });
});
