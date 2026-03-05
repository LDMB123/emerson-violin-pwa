import { whenReady } from '../utils/dom-ready.js';
import { refreshRecommendationsCache } from './recommendations.js';
import { ML_RECS, GAME_RECORDED, PRACTICE_RECORDED, SONG_RECORDED, ML_UPDATE, emitEvent } from '../utils/event-names.js';
import { scheduleBackgroundTask } from '../utils/idle-task.js';

const deviceMemory = navigator.deviceMemory || 4;
const MIN_INTERVAL = deviceMemory <= 4 ? 4 * 60 * 1000 : 2 * 60 * 1000;
let lastRun = 0;
let pending = false;

const scheduleTask = (task) => {
    // Prefer browser background/idle queues to reduce foreground contention and power draw.
    scheduleBackgroundTask(task, {
        delay: 200,
        idleTimeout: 1200,
        fallbackDelay: 200,
    });
};

const scheduleRefresh = (reason) => {
    const now = Date.now();
    if (document.visibilityState === 'hidden') return;
    if (pending) return;
    if (now - lastRun < MIN_INTERVAL) return;
    pending = true;
    scheduleTask(async () => {
        try {
            await refreshRecommendationsCache();
            emitEvent(ML_RECS, { reason });
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

whenReady(init);
