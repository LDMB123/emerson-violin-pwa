import { computeRecommendationsFromData } from './recommendations-engine.js';

let wasmReady = null;
let wasmModule = null;

const ensureWasmSeed = async () => {
    if (!wasmReady) {
        wasmReady = import('@core/wasm/panda_core.js')
            .then(async (module) => {
                wasmModule = module;
                if (typeof module.default === 'function') {
                    await module.default();
                }
                return module;
            })
            .catch(() => null);
    }
    await wasmReady;
    return wasmModule;
};

const computeWasmSeed = async (skillSamples, songSamples, allowWasmSeed) => {
    if (!allowWasmSeed) return null;
    if (!skillSamples?.length && !songSamples?.length) return null;
    const module = await ensureWasmSeed();
    if (!module?.compute_recommendation_seed) return null;
    try {
        return module.compute_recommendation_seed(skillSamples, songSamples);
    } catch {
        return null;
    }
};

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
            computeSeed: (skillSamples, songSamples) => computeWasmSeed(skillSamples, songSamples, data.allowWasmSeed),
        });
        respond(id, { result });
    } catch (error) {
        const message = error?.message || String(error);
        respond(id, { error: message });
    }
});
