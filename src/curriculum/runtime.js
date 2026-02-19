import { getLearningRecommendations } from '../ml/recommendations.js';

let initialized = false;

export const init = () => {
    if (initialized) return;
    initialized = true;
    getLearningRecommendations().catch(() => {
        // Recommendations are best-effort on startup.
    });
};
