import { computeRecommendationsFromData } from './recommendations-engine.js';

const respond = (id, payload) => {
    self.postMessage({ id, ...payload });
};

self.addEventListener('message', async (event) => {
    const data = event?.data || {};
    const id = data.id;
    if (!id) return;
    try {
        const result = await computeRecommendationsFromData({
            events: data.events,
            adaptiveLog: data.adaptiveLog,
            metronomeTuning: data.metronomeTuning,
        });
        respond(id, { result });
    } catch (error) {
        const message = error?.message || String(error);
        respond(id, { error: message });
    }
});
