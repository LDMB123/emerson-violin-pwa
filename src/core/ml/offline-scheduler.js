import { refreshRecommendationsCacheInWorker } from './recommendations.js';

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
            await refreshRecommendationsCacheInWorker();
            document.dispatchEvent(new CustomEvent('panda:ml-recs', { detail: { reason } }));
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
    document.addEventListener('panda:game-recorded', () => scheduleRefresh('game'));
    document.addEventListener('panda:practice-recorded', () => scheduleRefresh('practice'));
    document.addEventListener('panda:song-recorded', () => scheduleRefresh('song'));
    document.addEventListener('panda:ml-update', () => scheduleRefresh('adaptive'));
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
