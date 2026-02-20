import { getJSON, setJSON } from '../persistence/storage.js';
import { WEB_VITALS_KEY } from '../persistence/storage-keys.js';

const SESSION_LIMIT = 40;
const METRIC_EVENT = 'panda:web-vitals-updated';

let globalsBound = false;
let sessionPersisted = false;
const startedAt = Date.now();
const metrics = {
    ttfb: null,
    fcp: null,
    lcp: null,
    cls: 0,
    inp: null,
};

const round = (value, digits = 2) => {
    if (!Number.isFinite(value)) return null;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
};

const readNavigationTiming = () => {
    const entry = performance.getEntriesByType?.('navigation')?.[0];
    if (!entry) return;
    if (Number.isFinite(entry.responseStart)) {
        metrics.ttfb = round(entry.responseStart, 1);
    }
};

const observePaintMetrics = () => {
    if (typeof PerformanceObserver !== 'function') return;

    try {
        const paintObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.name === 'first-contentful-paint') {
                    metrics.fcp = round(entry.startTime, 1);
                }
            });
        });
        paintObserver.observe({ type: 'paint', buffered: true });
    } catch {
        // Paint observer unsupported.
    }

    try {
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const latest = entries[entries.length - 1];
            if (latest && Number.isFinite(latest.startTime)) {
                metrics.lcp = round(latest.startTime, 1);
            }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
        // LCP observer unsupported.
    }

    try {
        const clsObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.hadRecentInput) return;
                metrics.cls = round((metrics.cls || 0) + (entry.value || 0), 3);
            });
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
        // CLS observer unsupported.
    }

    try {
        const eventObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (!Number.isFinite(entry.duration) || entry.duration <= 0) return;
                if (!Number.isFinite(entry.interactionId) || entry.interactionId <= 0) return;
                metrics.inp = round(Math.max(metrics.inp || 0, entry.duration), 1);
            });
        });
        eventObserver.observe({ type: 'event', durationThreshold: 40, buffered: true });
    } catch {
        // INP observer unsupported.
    }
};

const normalizeHistory = (stored) => {
    const rawSessions = Array.isArray(stored?.sessions) ? stored.sessions : [];
    const sessions = rawSessions
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
            timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now(),
            reason: typeof entry.reason === 'string' ? entry.reason : 'unknown',
            route: typeof entry.route === 'string' ? entry.route : '#view-home',
            sessionMs: Number.isFinite(entry.sessionMs) ? entry.sessionMs : 0,
            metrics: {
                ttfb: Number.isFinite(entry.metrics?.ttfb) ? entry.metrics.ttfb : null,
                fcp: Number.isFinite(entry.metrics?.fcp) ? entry.metrics.fcp : null,
                lcp: Number.isFinite(entry.metrics?.lcp) ? entry.metrics.lcp : null,
                cls: Number.isFinite(entry.metrics?.cls) ? entry.metrics.cls : 0,
                inp: Number.isFinite(entry.metrics?.inp) ? entry.metrics.inp : null,
            },
        }));

    return {
        version: 1,
        sessions: sessions.slice(-SESSION_LIMIT),
    };
};

const buildSessionPayload = (reason = 'unknown') => ({
    timestamp: Date.now(),
    reason,
    route: window.location.hash || '#view-home',
    sessionMs: Math.max(0, Date.now() - startedAt),
    metrics: {
        ttfb: metrics.ttfb,
        fcp: metrics.fcp,
        lcp: metrics.lcp,
        cls: round(metrics.cls || 0, 3),
        inp: metrics.inp,
    },
});

const dispatchVitalsEvent = (session) => {
    document.dispatchEvent(new CustomEvent(METRIC_EVENT, {
        detail: {
            session,
            metrics: session.metrics,
            timestamp: session.timestamp,
        },
    }));
};

const persistSession = async (reason = 'unknown') => {
    if (sessionPersisted) return;
    sessionPersisted = true;

    try {
        const current = normalizeHistory(await getJSON(WEB_VITALS_KEY));
        const session = buildSessionPayload(reason);
        const next = {
            version: 1,
            sessions: [...current.sessions, session].slice(-SESSION_LIMIT),
        };
        await setJSON(WEB_VITALS_KEY, next);
        dispatchVitalsEvent(session);
    } catch {
        // Ignore persistence failures.
    }
};

const bindLifecyclePersistence = () => {
    if (globalsBound) return;
    globalsBound = true;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            persistSession('hidden').catch(() => {});
        }
    });

    window.addEventListener('pagehide', () => {
        persistSession('pagehide').catch(() => {});
    });
};

export const getWebVitalsHistory = async () => {
    const stored = await getJSON(WEB_VITALS_KEY);
    return normalizeHistory(stored);
};

export const getLatestWebVitalsSession = async () => {
    const history = await getWebVitalsHistory();
    return history.sessions[history.sessions.length - 1] || null;
};

const initWebVitals = () => {
    if (!('performance' in window)) return;
    readNavigationTiming();
    observePaintMetrics();
    bindLifecyclePersistence();
};

export const init = initWebVitals;
