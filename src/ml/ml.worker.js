import { computeRecommendations } from './recommendations-core.js';

let isProcessing = false;

self.onmessage = async (event) => {
    const { id, type } = event.data;

    if (type === 'COMPUTE_RECOMMENDATIONS') {
        if (isProcessing) {
            self.postMessage({ id, error: 'Worker is currently busy.' });
            return;
        }

        isProcessing = true;
        try {
            const recommendations = await computeRecommendations(event.data.queuedGoals || []);
            self.postMessage({ id, result: recommendations });
        } catch (error) {
            console.error("ML Worker Error:", error);
            self.postMessage({ id, error: error.message });
        } finally {
            isProcessing = false;
        }
    } else {
        self.postMessage({ id, error: `Unknown ML worker command: ${type}` });
    }
};
