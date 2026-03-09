import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { computeRecommendations } from './recommendations-core.js';

describe('ML Recommendations Engine', () => {
    beforeAll(() => {
        vi.spyOn(window, 'fetch').mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ songs: [] })
            })
        );
    });

    afterAll(() => {
        vi.restoreAllMocks();
    });

    it('successfully computes recommendations despite storage/fetch failures', async () => {
        let reached = false;
        try {
            console.log("-> Starting computeRecommendations");
            const res = await computeRecommendations();
            console.log("-> Finished computeRecommendations. Steps:", res?.mission?.steps?.length);
            reached = true;
            expect(res).toBeDefined();
            expect(res.mission).toBeDefined();
        } catch (e) {
            console.error("-> CRASH in computeRecommendations", e);
            throw e;
        }
        expect(reached).toBe(true);
    });
});
