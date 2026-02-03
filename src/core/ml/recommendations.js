import { getJSON, setJSON } from '../persistence/storage.js';
import { getAdaptiveLog, getGameTuning } from './adaptive-engine.js';
import initCore, { compute_recommendation_seed } from '@core/wasm/panda_core.js';
import { computeRecommendationsFromData } from './recommendations-engine.js';

const EVENT_KEY = 'panda-violin:events:v1';
const CACHE_KEY = 'panda-violin:ml:recs-v1';
const CACHE_TTL = 5 * 60 * 1000;

let worker = null;
let workerCounter = 0;
const workerRequests = new Map();

const isWorkerSupported = () => typeof Worker !== 'undefined';

const ensureWorker = () => {
    if (!isWorkerSupported()) return null;
    if (worker) return worker;
    worker = new Worker(new URL('./recommendations-worker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event) => {
        const { id, result, error } = event.data || {};
        if (!id) return;
        const pending = workerRequests.get(id);
        if (!pending) return;
        workerRequests.delete(id);
        if (error) pending.reject(new Error(error));
        else pending.resolve(result);
    });
    worker.addEventListener('error', (error) => {
        workerRequests.forEach((pending) => pending.reject(error));
        workerRequests.clear();
    });
    return worker;
};

const runWorker = (payload) => {
    const instance = ensureWorker();
    if (!instance) return null;
    return new Promise((resolve, reject) => {
        const id = ++workerCounter;
        workerRequests.set(id, { resolve, reject });
        instance.postMessage({ id, ...payload });
    });
};

const loadEvents = async () => {
    const stored = await getJSON(EVENT_KEY);
    return Array.isArray(stored) ? stored : [];
};

const computeRecommendations = async () => {
    const [events, adaptiveLog, metronomeTuning] = await Promise.all([
        loadEvents(),
        getAdaptiveLog(),
        getGameTuning('trainer-metronome').catch(() => ({ targetBpm: 90 })),
    ]);

    const computeSeed = async (skillSamples, songSamples) => {
        if (typeof compute_recommendation_seed !== 'function') return null;
        if (!skillSamples.length && !songSamples.length) return null;
        try {
            await initCore();
            return compute_recommendation_seed(skillSamples, songSamples);
        } catch {
            return null;
        }
    };

    return computeRecommendationsFromData({
        events,
        adaptiveLog,
        metronomeTuning,
        computeSeed,
    });
};

const readCache = async () => {
    const cached = await getJSON(CACHE_KEY);
    if (!cached || typeof cached !== 'object') return null;
    if (!cached.recommendations) return null;
    return cached;
};

const cacheFresh = (cached) => {
    if (!cached?.updatedAt) return false;
    return (Date.now() - cached.updatedAt) < CACHE_TTL;
};

export const refreshRecommendationsCache = async () => {
    const recommendations = await computeRecommendations();
    const payload = {
        updatedAt: Date.now(),
        recommendations,
    };
    await setJSON(CACHE_KEY, payload);
    return recommendations;
};

export const refreshRecommendationsCacheInWorker = async () => {
    if (!isWorkerSupported()) return refreshRecommendationsCache();
    const [events, adaptiveLog, metronomeTuning] = await Promise.all([
        loadEvents(),
        getAdaptiveLog(),
        getGameTuning('trainer-metronome').catch(() => ({ targetBpm: 90 })),
    ]);
    const recommendations = await runWorker({ events, adaptiveLog, metronomeTuning });
    const payload = {
        updatedAt: Date.now(),
        recommendations,
    };
    await setJSON(CACHE_KEY, payload);
    return recommendations;
};

export const getCachedRecommendations = async () => {
    const cached = await readCache();
    return cached?.recommendations || null;
};

export const getLearningRecommendations = async ({ allowCached = true } = {}) => {
    if (allowCached) {
        const cached = await readCache();
        if (cached?.recommendations) {
            if (!cacheFresh(cached)) {
                refreshRecommendationsCacheInWorker().catch(() => {});
            }
            return cached.recommendations;
        }
    }
    return refreshRecommendationsCache();
};

export const isRecommendationsWorkerSupported = isWorkerSupported;
