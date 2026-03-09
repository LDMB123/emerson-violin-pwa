import { getJSON, setJSON } from '../persistence/storage.js';
import { ML_RECS_KEY as CACHE_KEY } from '../persistence/storage-keys.js';
import { readQueuedGoals } from '../coach/mission-progress-goals.js';
import MLWorker from './ml.worker.js?worker';
import { computeRecommendations } from './recommendations-core.js';

const CACHE_TTL = 5 * 60 * 1000;
let refreshPromise = null;
let cacheReadPromise = null;
let workerInstance = null;

const getWorker = () => {
    if (!workerInstance) {
        if (typeof Worker !== 'undefined' && typeof MLWorker === 'function') {
            workerInstance = new MLWorker();
        } else {
            workerInstance = {
                listeners: {},
                addEventListener: function (type, cb) {
                    this.listeners[type] = cb;
                },
                removeEventListener: function (type, cb) {
                    if (this.listeners[type] === cb) this.listeners[type] = null;
                },
                postMessage: async function (data) {
                    try {
                        const result = await computeRecommendations(data.queuedGoals || []);
                        if (this.listeners['message']) this.listeners['message']({ data: { id: data.id, result } });
                    } catch (e) {
                        if (this.listeners['message']) this.listeners['message']({ data: { id: data.id, error: e.message } });
                    }
                }
            };
        }
    }
    return workerInstance;
};

const runWorkerTask = (type, payload = {}) => {
    return new Promise((resolve, reject) => {
        const id = Date.now().toString() + Math.random().toString();
        const worker = getWorker();

        const handler = (event) => {
            if (event.data.id === id) {
                worker.removeEventListener('message', handler);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data.result);
                }
            }
        };

        worker.addEventListener('message', handler);
        worker.postMessage({ id, type, ...payload });
    });
};

const readCache = async () => {
    if (cacheReadPromise) return cacheReadPromise;
    cacheReadPromise = getJSON(CACHE_KEY)
        .then((cached) => {
            if (!cached || typeof cached !== 'object') return null;
            if (!cached.recommendations) return null;
            return cached;
        })
        .finally(() => {
            cacheReadPromise = null;
        });
    return cacheReadPromise;
};

const runRefreshRecommendations = async () => {
    const queuedGoals = readQueuedGoals() || [];
    const recommendations = await runWorkerTask('COMPUTE_RECOMMENDATIONS', { queuedGoals });
    const payload = {
        updatedAt: Date.now(),
        recommendations,
    };
    await setJSON(CACHE_KEY, payload);
    return recommendations;
};

/** Recomputes recommendations and refreshes the persisted recommendations cache. */
export const refreshRecommendationsCache = async () => {
    if (refreshPromise) {
        return refreshPromise;
    }
    refreshPromise = runRefreshRecommendations().finally(() => {
        refreshPromise = null;
    });
    return refreshPromise;
};

/** Returns learning recommendations, optionally serving and refreshing cached data. */
export const getLearningRecommendations = async ({ allowCached = true } = {}) => {
    if (allowCached) {
        const cached = await readCache();
        if (cached?.recommendations) {
            if (!cached?.updatedAt || (Date.now() - cached.updatedAt) >= CACHE_TTL) {
                refreshRecommendationsCache().catch(() => { });
            }
            return cached.recommendations;
        }
    }
    return refreshRecommendationsCache();
};
