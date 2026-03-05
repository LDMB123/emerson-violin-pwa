import { getJSON, setJSON } from '../persistence/storage.js';
import { OFFLINE_METRICS_KEY as METRICS_KEY } from '../persistence/storage-keys.js';

/**
 * Returns the default offline integrity metrics shape.
 *
 * @returns {{
 *   cachedAssets: number,
 *   misses: number,
 *   lastMiss: number,
 *   lastRefresh: number,
 *   lastCheck: number,
 *   selfTestPass: number,
 *   selfTestTotal: number,
 *   selfTestAt: number
 * }}
 */
export const defaultOfflineMetrics = () => ({
    cachedAssets: 0,
    misses: 0,
    lastMiss: 0,
    lastRefresh: 0,
    lastCheck: 0,
    selfTestPass: 0,
    selfTestTotal: 0,
    selfTestAt: 0,
});

/**
 * Loads offline integrity metrics from persistence.
 *
 * @returns {Promise<ReturnType<typeof defaultOfflineMetrics>>}
 */
export const loadOfflineMetrics = async () => {
    const stored = await getJSON(METRICS_KEY);
    return { ...defaultOfflineMetrics(), ...(stored || {}) };
};

/**
 * Persists offline integrity metrics.
 *
 * @param {ReturnType<typeof defaultOfflineMetrics>} metrics
 * @returns {Promise<void>}
 */
export const saveOfflineMetrics = async (metrics) => {
    await setJSON(METRICS_KEY, metrics);
};

/**
 * Formats self-test results for the UI.
 *
 * @param {ReturnType<typeof defaultOfflineMetrics>} metrics
 * @returns {string}
 */
export const formatOfflineSelfTestStatus = (metrics) => {
    if (!metrics.selfTestTotal) {
        return 'Offline self-test: not run yet.';
    }
    const missing = metrics.selfTestTotal - metrics.selfTestPass;
    const status = missing ? `Missing ${missing}` : 'All checks passed';
    return `Offline self-test: ${metrics.selfTestPass}/${metrics.selfTestTotal} (${status}).`;
};

/**
 * Formats the overall offline readiness status for the UI.
 *
 * @param {ReturnType<typeof defaultOfflineMetrics>} metrics
 * @returns {string}
 */
export const formatOfflineStatus = (metrics) => {
    if (!metrics.cachedAssets) {
        return 'Offline integrity: Not cached yet. Open once while online.';
    }
    if (!navigator.onLine) {
        return 'Offline integrity: Ready for offline use.';
    }
    return 'Offline integrity: Ready. Keep installed for best results.';
};
