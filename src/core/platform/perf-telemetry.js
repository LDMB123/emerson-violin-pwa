import { getJSON, setJSON } from '../persistence/storage.js';

const METRICS_KEY = 'panda-violin:perf:metrics-v1';
const MAX_SAMPLES = 20;
const FLUSH_DELAY = 15000;

const state = {
    lcp: null,
    eventMax: 0,
    eventCount: 0,
    eventTotal: 0,
    longTaskMax: 0,
    longTaskCount: 0,
    longTaskTotal: 0,
};

let flushed = false;
let flushTimer = null;
const observers = [];

const supported = PerformanceObserver?.supportedEntryTypes || [];

const recordLcp = () => {
    if (!supported.includes('largest-contentful-paint')) return;
    try {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (Number.isFinite(entry.startTime)) {
                    state.lcp = Math.round(entry.startTime);
                }
            });
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        observers.push(observer);
    } catch {
        // Ignore observer failures.
    }
};

const recordEventTiming = () => {
    if (!supported.includes('event')) return;
    try {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                const duration = Number(entry.duration) || 0;
                if (!duration) return;
                state.eventCount += 1;
                state.eventTotal += duration;
                state.eventMax = Math.max(state.eventMax, duration);
            });
        });
        observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
        observers.push(observer);
    } catch {
        // Ignore observer failures.
    }
};

const recordLongTasks = () => {
    if (!supported.includes('longtask')) return;
    try {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                const duration = Number(entry.duration) || 0;
                if (!duration) return;
                state.longTaskCount += 1;
                state.longTaskTotal += duration;
                state.longTaskMax = Math.max(state.longTaskMax, duration);
            });
        });
        observer.observe({ type: 'longtask', buffered: true });
        observers.push(observer);
    } catch {
        // Ignore observer failures.
    }
};

const disconnectObservers = () => {
    observers.forEach((observer) => {
        try {
            observer.disconnect();
        } catch {
            // Ignore disconnect errors.
        }
    });
    observers.length = 0;
};

const buildSample = (reason) => {
    const eventAvg = state.eventCount ? state.eventTotal / state.eventCount : 0;
    const longTaskAvg = state.longTaskCount ? state.longTaskTotal / state.longTaskCount : 0;
    return {
        timestamp: Date.now(),
        reason,
        viewId: window.location.hash?.replace('#', '') || 'view-home',
        lcpMs: state.lcp,
        eventMaxMs: Math.round(state.eventMax || 0),
        eventAvgMs: Math.round(eventAvg || 0),
        eventCount: state.eventCount,
        longTaskMaxMs: Math.round(state.longTaskMax || 0),
        longTaskAvgMs: Math.round(longTaskAvg || 0),
        longTaskCount: state.longTaskCount,
        deviceMemory: navigator.deviceMemory || null,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
    };
};

const persistSample = async (sample) => {
    const stored = await getJSON(METRICS_KEY);
    const next = Array.isArray(stored) ? stored.slice(0, MAX_SAMPLES - 1) : [];
    next.unshift(sample);
    await setJSON(METRICS_KEY, next);
};

const flush = async (reason) => {
    if (flushed) return;
    flushed = true;
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    disconnectObservers();
    try {
        await persistSample(buildSample(reason));
    } catch {
        // Ignore persistence failures.
    }
};

const scheduleFlush = (reason) => {
    if (flushed || flushTimer) return;
    flushTimer = window.setTimeout(() => {
        flushTimer = null;
        if (document.visibilityState === 'hidden') {
            flush(reason);
        }
    }, FLUSH_DELAY);
};

const bindLifecycle = () => {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            scheduleFlush('hidden');
        } else if (flushTimer) {
            clearTimeout(flushTimer);
            flushTimer = null;
        }
    });
    window.addEventListener('pagehide', () => {
        flush('pagehide');
    }, { once: true });
};

const init = () => {
    recordLcp();
    recordEventTiming();
    recordLongTasks();
    bindLifecycle();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
