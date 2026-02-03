import { describe, expect, it } from 'vitest';
import { computeRecommendationsFromData } from '@core/ml/recommendations-engine.js';

describe('recommendations engine', () => {
    it('computes recommendations from sample data', async () => {
        const result = await computeRecommendationsFromData({
            events: [
                { type: 'song', id: 'twinkle', accuracy: 72, timestamp: Date.now() - 5000 },
                { type: 'song', id: 'mary', accuracy: 82, timestamp: Date.now() - 3000 },
            ],
            adaptiveLog: [
                { id: 'pitch-quest', accuracy: 55, timestamp: Date.now() - 8000 },
                { id: 'rhythm-dash', accuracy: 80, timestamp: Date.now() - 7000 },
            ],
            metronomeTuning: { targetBpm: 96 },
        });

        expect(result).toBeTruthy();
        expect(result.recommendedGameId).toBeTruthy();
        expect(result.lessonSteps?.length).toBeGreaterThan(0);
        expect(result.lessonTotal).toBeGreaterThan(0);
        expect(result.metronomeTarget).toBe(96);
    });
});
