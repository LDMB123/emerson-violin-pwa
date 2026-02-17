import { refreshRecommendationsCache } from './recommendations.js';
import { ML_RECS, GAME_RECORDED, PRACTICE_RECORDED, SONG_RECORDED, ML_UPDATE } from '../utils/event-names.js';

const deviceMemory = navigator.deviceMemory || 4;
const MIN_INTERVAL = deviceMemory <= 4 ? 4 * 60 * 1000 : 2 * 60 * 1000;
let lastRun = 0;
let pending = false;

const scheduleTask = (task) => {
    if (globalThis.scheduler?.postTask) {
        globalThis.scheduler.postTask(task, { priority: 'background' });
        return;
    }
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => task(), { timeout: 1200 });
        return;
    }
    window.setTimeout(task, 200);
};

const scheduleRefresh = (reason) => {
    const now = Date.now();
    if (pending) return;
    if (now - lastRun < MIN_INTERVAL) return;
    pending = true;
    scheduleTask(async () => {
        try {
            await refreshRecommendationsCache();
            document.dispatchEvent(new CustomEvent(ML_RECS, { detail: { reason } }));
        } catch {
            // Ignore ML cache failures
        } finally {
            lastRun = Date.now();
            pending = false;
        }
    });
};

const bindLifecycle = () => {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            scheduleRefresh('visible');
        }
    });
    window.addEventListener('online', () => scheduleRefresh('online'), { passive: true });
};

const bindEvents = () => {
    document.addEventListener(GAME_RECORDED, () => scheduleRefresh('game'));
    document.addEventListener(PRACTICE_RECORDED, () => scheduleRefresh('practice'));
    document.addEventListener(SONG_RECORDED, () => scheduleRefresh('song'));
    document.addEventListener(ML_UPDATE, () => scheduleRefresh('adaptive'));
};

const init = () => {
    bindLifecycle();
    bindEvents();
    scheduleRefresh('boot');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
