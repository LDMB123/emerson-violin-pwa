import { getJSON, setJSON } from '../persistence/storage.js';
import { ML_RECS_KEY as CACHE_KEY } from '../persistence/storage-keys.js';
import { computeRecommendations } from './recommendations-core.js';

const CACHE_TTL = 5 * 60 * 1000;
let refreshPromise = null;
let cacheReadPromise = null;

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
    const recommendations = await computeRecommendations();
    const payload = {
        updatedAt: Date.now(),
        recommendations,
    };
    await setJSON(CACHE_KEY, payload);
    return recommendations;
};

export const refreshRecommendationsCache = async () => {
    if (refreshPromise) {
        return refreshPromise;
    }
    refreshPromise = runRefreshRecommendations().finally(() => {
        refreshPromise = null;
    });
    return refreshPromise;
};

export const getLearningRecommendations = async ({ allowCached = true } = {}) => {
    if (allowCached) {
        const cached = await readCache();
        if (cached?.recommendations) {
            if (!cached?.updatedAt || (Date.now() - cached.updatedAt) >= CACHE_TTL) {
                refreshRecommendationsCache().catch(() => {});
            }
            return cached.recommendations;
        }
    }
    return refreshRecommendationsCache();
};
