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

const scheduleRefreshFor = (reason) => () => scheduleRefresh(reason);

const addListener = ([target, eventName, listener, options]) => {
    target.addEventListener(eventName, listener, options);
};

const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
        scheduleRefresh('visible');
    }
};

const lifecycleListeners = [
    [document, 'visibilitychange', handleVisibilityChange],
    [window, 'online', scheduleRefreshFor('online'), { passive: true }],
];

const refreshListeners = [
    [document, GAME_RECORDED, scheduleRefreshFor('game')],
    [document, PRACTICE_RECORDED, scheduleRefreshFor('practice')],
    [document, SONG_RECORDED, scheduleRefreshFor('song')],
    [document, ML_UPDATE, scheduleRefreshFor('adaptive')],
];

const bindLifecycle = () => {
    lifecycleListeners.forEach(addListener);
};

const bindEvents = () => {
    refreshListeners.forEach(addListener);
};

const init = () => {
    bindLifecycle();
    bindEvents();
    scheduleRefresh('boot');
};

whenReady(init);
