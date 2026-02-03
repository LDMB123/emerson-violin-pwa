import { getJSON, setJSON } from '../persistence/storage.js';

const METRICS_KEY = 'panda-violin:perf:metrics-v1';
const MAX_SAMPLES = 20;
const FLUSH_DELAY = 15000;
const AUTO_BASELINE_MS = 5 * 60 * 1000;
const TUNER_BASELINE_MS = 60 * 1000;

const baselineEl = document.querySelector('[data-perf-baseline]');
const ttiEl = document.querySelector('[data-perf-tti]');
const audioEl = document.querySelector('[data-perf-audio]');
const snapshotButton = document.querySelector('[data-perf-snapshot]');
const exportButton = document.querySelector('[data-perf-export]');
const clearButton = document.querySelector('[data-perf-clear]');

const state = {
    lcp: null,
    eventMax: 0,
    eventCount: 0,
    eventTotal: 0,
    longTaskMax: 0,
    longTaskCount: 0,
    longTaskTotal: 0,
    firstInteractionMs: null,
    domContentLoadedMs: null,
    loadEventMs: null,
    audioCount: 0,
    audioTotalMs: 0,
    audioMaxMs: 0,
    audioBufferSize: null,
    audioSampleRate: null,
    featureLoadCount: 0,
    featureLoadTotalMs: 0,
    featureLoadMaxMs: 0,
    lastFeatureLoad: null,
    frameCount: 0,
    frameTotal: 0,
    frameMax: 0,
    frameOver32: 0,
    memoryBytes: null,
    tunerStartMs: null,
};

let flushed = false;
let flushTimer = null;
const observers = [];
let memoryTimer = null;
let autoSnapshotTimer = null;
let tunerSnapshotTimer = null;

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
                if (Number.isFinite(entry.startTime)) {
                    markInteraction(entry.startTime);
                }
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

const markInteraction = (timeMs) => {
    if (!Number.isFinite(timeMs)) return;
    if (state.firstInteractionMs === null || timeMs < state.firstInteractionMs) {
        state.firstInteractionMs = timeMs;
    }
};

const bindFirstInput = () => {
    const handler = () => {
        markInteraction(performance.now());
    };
    window.addEventListener('pointerdown', handler, { once: true, passive: true });
    window.addEventListener('keydown', handler, { once: true, passive: true });
};

const bindAudioPerf = () => {
    document.addEventListener('panda:audio-perf', (event) => {
        const detail = event.detail || {};
        const processMs = Number(detail.processMs);
        if (!Number.isFinite(processMs)) return;
        state.audioCount += 1;
        state.audioTotalMs += processMs;
        state.audioMaxMs = Math.max(state.audioMaxMs, processMs);
        if (Number.isFinite(detail.bufferSize)) {
            state.audioBufferSize = detail.bufferSize;
        }
        if (Number.isFinite(detail.sampleRate)) {
            state.audioSampleRate = detail.sampleRate;
        }
    });
};

const bindFeaturePerf = () => {
    document.addEventListener('panda:feature-load', (event) => {
        const detail = event.detail || {};
        const durationMs = Number(detail.durationMs);
        if (!Number.isFinite(durationMs)) return;
        state.featureLoadCount += 1;
        state.featureLoadTotalMs += durationMs;
        state.featureLoadMaxMs = Math.max(state.featureLoadMaxMs, durationMs);
        state.lastFeatureLoad = detail.featureId || state.lastFeatureLoad;
    });
};

const bindTunerPerf = () => {
    document.addEventListener('panda:tuner-first-note', (event) => {
        const detail = event.detail || {};
        if (!Number.isFinite(detail.elapsedMs)) return;
        state.tunerStartMs = Math.round(detail.elapsedMs);
        if (!tunerSnapshotTimer) {
            tunerSnapshotTimer = window.setTimeout(() => {
                tunerSnapshotTimer = null;
                if (flushed) return;
                snapshot('tuner-60s');
            }, TUNER_BASELINE_MS);
        }
    });
};

const bindFrameSampler = () => {
    let last = performance.now();
    const tick = (now) => {
        const delta = now - last;
        last = now;
        if (Number.isFinite(delta) && delta > 0) {
            state.frameCount += 1;
            state.frameTotal += delta;
            state.frameMax = Math.max(state.frameMax, delta);
            if (delta > 32) state.frameOver32 += 1;
        }
        window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
};

const bindMemorySampler = () => {
    const measure = async () => {
        try {
            if (typeof performance?.measureUserAgentSpecificMemory === 'function') {
                const result = await performance.measureUserAgentSpecificMemory();
                if (Number.isFinite(result?.bytes)) {
                    state.memoryBytes = Math.round(result.bytes);
                }
                return;
            }
            if (performance?.memory?.usedJSHeapSize) {
                state.memoryBytes = Math.round(performance.memory.usedJSHeapSize);
            }
        } catch {
            // Ignore memory sampling failures.
        }
    };

    measure();
    memoryTimer = window.setInterval(measure, 10000);
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
    if (memoryTimer) {
        clearInterval(memoryTimer);
        memoryTimer = null;
    }
    if (autoSnapshotTimer) {
        clearTimeout(autoSnapshotTimer);
        autoSnapshotTimer = null;
    }
    if (tunerSnapshotTimer) {
        clearTimeout(tunerSnapshotTimer);
        tunerSnapshotTimer = null;
    }
};

const formatTimestamp = (value) => {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return '—';
    }
};

const formatMs = (value) => (Number.isFinite(value) ? `${Math.round(value)} ms` : '—');
const formatPct = (value) => (Number.isFinite(value) ? `${Math.round(value)}%` : '—');
const formatBytes = (value) => {
    if (!Number.isFinite(value)) return '—';
    const mb = value / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
};

const formatConnection = (connection) => {
    if (!connection) return null;
    return {
        effectiveType: connection.effectiveType,
        saveData: connection.saveData,
        downlink: connection.downlink,
        rtt: connection.rtt,
    };
};

const collectEnvironment = async () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    let storage = null;
    if (navigator.storage?.estimate) {
        try {
            storage = await navigator.storage.estimate();
        } catch {
            storage = null;
        }
    }
    return {
        userAgent: navigator.userAgent || null,
        platform: navigator.platform || null,
        languages: navigator.languages || (navigator.language ? [navigator.language] : []),
        deviceMemory: navigator.deviceMemory || null,
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        devicePixelRatio: window.devicePixelRatio || null,
        screen: {
            width: window.screen?.width || null,
            height: window.screen?.height || null,
            availWidth: window.screen?.availWidth || null,
            availHeight: window.screen?.availHeight || null,
            colorDepth: window.screen?.colorDepth || null,
        },
        connection: formatConnection(connection),
        storage: storage ? { quota: storage.quota, usage: storage.usage } : null,
    };
};

const buildSample = (reason) => {
    const eventAvg = state.eventCount ? state.eventTotal / state.eventCount : 0;
    const longTaskAvg = state.longTaskCount ? state.longTaskTotal / state.longTaskCount : 0;
    const audioAvg = state.audioCount ? state.audioTotalMs / state.audioCount : 0;
    const featureAvg = state.featureLoadCount ? state.featureLoadTotalMs / state.featureLoadCount : 0;
    const frameAvg = state.frameCount ? state.frameTotal / state.frameCount : 0;
    const audioBudgetMs = (state.audioBufferSize && state.audioSampleRate)
        ? (state.audioBufferSize / state.audioSampleRate) * 1000
        : null;
    const audioBudgetPct = (audioBudgetMs && audioAvg)
        ? (audioAvg / audioBudgetMs) * 100
        : null;
    return {
        timestamp: Date.now(),
        reason,
        viewId: window.location.hash?.replace('#', '') || 'view-home',
        lcpMs: state.lcp,
        ttiProxyMs: state.firstInteractionMs ? Math.round(state.firstInteractionMs) : null,
        domContentLoadedMs: state.domContentLoadedMs ? Math.round(state.domContentLoadedMs) : null,
        loadEventMs: state.loadEventMs ? Math.round(state.loadEventMs) : null,
        eventMaxMs: Math.round(state.eventMax || 0),
        eventAvgMs: Math.round(eventAvg || 0),
        eventCount: state.eventCount,
        longTaskMaxMs: Math.round(state.longTaskMax || 0),
        longTaskAvgMs: Math.round(longTaskAvg || 0),
        longTaskCount: state.longTaskCount,
        audioAvgMs: audioAvg ? Math.round(audioAvg) : null,
        audioMaxMs: state.audioMaxMs ? Math.round(state.audioMaxMs) : null,
        audioCount: state.audioCount,
        audioBudgetMs: audioBudgetMs ? Math.round(audioBudgetMs) : null,
        audioBudgetPct: audioBudgetPct ? Math.round(audioBudgetPct) : null,
        featureLoadAvgMs: featureAvg ? Math.round(featureAvg) : null,
        featureLoadMaxMs: state.featureLoadMaxMs ? Math.round(state.featureLoadMaxMs) : null,
        lastFeatureLoad: state.lastFeatureLoad,
        frameMaxMs: state.frameMax ? Math.round(state.frameMax) : null,
        frameAvgMs: frameAvg ? Math.round(frameAvg) : null,
        frameOver32: state.frameOver32,
        memoryBytes: state.memoryBytes,
        tunerStartMs: state.tunerStartMs,
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

const updateBaselineUI = async (sampleOverride = null) => {
    if (!baselineEl && !ttiEl && !audioEl) return;
    let sample = sampleOverride;
    if (!sample) {
        const stored = await getJSON(METRICS_KEY);
        sample = Array.isArray(stored) ? stored[0] : null;
    }
    if (baselineEl) {
        baselineEl.textContent = sample
            ? `Baseline: ${formatTimestamp(sample.timestamp)} · ${sample.reason || 'auto'}`
            : 'Baseline: no samples yet.';
    }
    if (ttiEl) {
        ttiEl.textContent = sample
            ? `TTI proxy ${formatMs(sample.ttiProxyMs)} · LCP ${formatMs(sample.lcpMs)} · Input max ${formatMs(sample.eventMaxMs)} · Long task max ${formatMs(sample.longTaskMaxMs)} · Frame max ${formatMs(sample.frameMaxMs)}`
            : 'TTI proxy: —';
    }
    if (audioEl) {
        audioEl.textContent = sample
            ? `Audio budget avg ${formatMs(sample.audioAvgMs)} / ${formatMs(sample.audioBudgetMs)} (${formatPct(sample.audioBudgetPct)}) · max ${formatMs(sample.audioMaxMs)} · tuner start ${formatMs(sample.tunerStartMs)} · mem ${formatBytes(sample.memoryBytes)}`
            : 'Audio budget: —';
    }
};

const snapshot = async (reason) => {
    const sample = buildSample(reason);
    await persistSample(sample);
    await updateBaselineUI(sample);
    return sample;
};

const clearHistory = async () => {
    await setJSON(METRICS_KEY, []);
    await updateBaselineUI(null);
};

const exportHistory = async () => {
    const stored = await getJSON(METRICS_KEY);
    const env = await collectEnvironment();
    const payload = {
        exportedAt: Date.now(),
        env,
        samples: Array.isArray(stored) ? stored : [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    link.href = url;
    link.download = `panda-violin-perf-${timestamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    if (baselineEl) {
        baselineEl.textContent = `Baseline exported: ${formatTimestamp(payload.exportedAt)}`;
    }
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
        await snapshot(reason);
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
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
        if (Number.isFinite(nav.domContentLoadedEventEnd)) {
            state.domContentLoadedMs = nav.domContentLoadedEventEnd;
        }
        if (Number.isFinite(nav.loadEventEnd)) {
            state.loadEventMs = nav.loadEventEnd;
        }
    }
    recordLcp();
    recordEventTiming();
    recordLongTasks();
    bindFirstInput();
    bindAudioPerf();
    bindFeaturePerf();
    bindTunerPerf();
    bindFrameSampler();
    bindMemorySampler();
    updateBaselineUI();
    if (!autoSnapshotTimer) {
        autoSnapshotTimer = window.setTimeout(() => {
            autoSnapshotTimer = null;
            if (flushed) return;
            if (document.visibilityState !== 'visible') return;
            snapshot('5m');
        }, AUTO_BASELINE_MS);
    }
    if (snapshotButton) {
        snapshotButton.addEventListener('click', () => {
            snapshot('manual');
        });
    }
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            exportHistory();
        });
    }
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            clearHistory();
        });
    }
    bindLifecycle();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
