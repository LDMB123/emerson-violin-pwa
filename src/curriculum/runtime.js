import { getLearningRecommendations } from '../ml/recommendations.js';

let initialized = false;

/** Initializes curriculum runtime by warming recommendations once per session. */
export const init = () => {
    if (initialized) return;
    initialized = true;
    getLearningRecommendations().catch(() => {
        // Recommendations are best-effort on startup.
    });
};
