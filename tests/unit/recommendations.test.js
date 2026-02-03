import { describe, expect, it, vi } from 'vitest';

const now = Date.now();

vi.mock('@core/persistence/storage.js', () => ({
    getJSON: vi.fn(async (key) => {
        if (key === 'panda-violin:events:v1') {
            return [
                { type: 'song', id: 'twinkle', accuracy: 72, day: 1, timestamp: now - 2000 },
                { type: 'song', id: 'mary', accuracy: 78, day: 1, timestamp: now - 1000 },
            ];
        }
        return null;
    }),
    setJSON: vi.fn(async () => {}),
}));

vi.mock('@core/ml/adaptive-engine.js', () => ({
    getAdaptiveLog: vi.fn(async () => ([
        { id: 'pitch-quest', accuracy: 55, timestamp: now - 8000 },
        { id: 'rhythm-dash', accuracy: 80, timestamp: now - 7000 },
    ])),
    getGameTuning: vi.fn(async () => ({ targetBpm: 88 })),
}));

import { getLearningRecommendations } from '@core/ml/recommendations.js';

describe('learning recommendations', () => {
    it('returns structured lesson plan data', async () => {
        const recs = await getLearningRecommendations({ allowCached: false });
        expect(recs).toBeTruthy();
        expect(recs.recommendedGameId).toBeTruthy();
        expect(recs.lessonSteps?.length).toBeGreaterThan(0);
        expect(recs.lessonTotal).toBeGreaterThan(0);
        expect(recs.metronomeTarget).toBe(88);
    });
});
