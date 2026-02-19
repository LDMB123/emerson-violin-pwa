import { describe, expect, it } from 'vitest';

import { aggregateSongAssessments, assessSongAttempt } from '../../src/songs/song-assessment.js';

describe('songs/song-assessment', () => {
    it('scores attempts with stars and tier', () => {
        const assessment = assessSongAttempt({
            accuracy: 89,
            timingAccuracy: 91,
            intonationAccuracy: 87,
            tempo: 84,
            attemptType: 'section',
        });

        expect(assessment).toMatchObject({
            accuracy: 89,
            timingAccuracy: 91,
            intonationAccuracy: 87,
            tempo: 84,
            attemptType: 'section',
        });
        expect(assessment.stars).toBeGreaterThanOrEqual(3);
        expect(['bronze', 'silver', 'gold', 'foundation']).toContain(assessment.tier);
    });

    it('aggregates best song metrics across attempts', () => {
        const aggregated = aggregateSongAssessments([
            { type: 'song', id: 'twinkle', accuracy: 72, timingAccuracy: 70, intonationAccuracy: 68, stars: 2, tempo: 72 },
            { type: 'song', id: 'twinkle', accuracy: 90, timingAccuracy: 92, intonationAccuracy: 88, stars: 4, tempo: 84 },
            { type: 'song', id: 'mary', accuracy: 61, timingAccuracy: 63, intonationAccuracy: 60, stars: 2, tempo: 78 },
        ]);

        expect(aggregated.twinkle).toMatchObject({
            attempts: 2,
            bestAccuracy: 90,
            bestTiming: 92,
            bestIntonation: 88,
            bestStars: 4,
            latestTempo: 84,
        });
        expect(aggregated.mary.attempts).toBe(1);
    });

    it('maps low and mid performance to expected stars and foundation tier', () => {
        const threeStar = assessSongAttempt({ accuracy: 80, timingAccuracy: 79, intonationAccuracy: 78 });
        const twoStar = assessSongAttempt({ accuracy: 67, timingAccuracy: 66, intonationAccuracy: 66 });
        const oneStar = assessSongAttempt({ accuracy: 50, timingAccuracy: 50, intonationAccuracy: 50 });
        const zeroStar = assessSongAttempt({ accuracy: 20, timingAccuracy: 20, intonationAccuracy: 20, tempo: 10 });

        expect(threeStar.stars).toBe(3);
        expect(twoStar.stars).toBe(2);
        expect(oneStar.stars).toBe(1);
        expect(zeroStar.stars).toBe(0);
        expect(zeroStar.tier).toBe('foundation');
        expect(zeroStar.tempo).toBe(30);
    });
});
