import { getJSON, setJSON } from '../persistence/storage.js';
import { getViewId, onViewChange } from '../utils/view-events.js';
import { isIPadOS, parseIPadOSVersion } from './ipados.js';

const PERF_KEY = 'panda-violin:performance-mode:v1';
const perfToggle = document.querySelector('#setting-performance');
const statusEl = document.querySelector('[data-performance-status]');
const metricsEl = document.querySelector('[data-performance-metrics]');
const capabilitiesEl = document.querySelector('[data-performance-capabilities]');
const diagnosticsEl = document.querySelector('.performance-diagnostics');
const root = document.documentElement;

let monitorId = null;
let reportId = null;
let monitoring = false;
let frameCount = 0;
let slowFrames = 0;
let lastFrame = 0;
let sampleStart = 0;
let longTaskObserver = null;
let longTaskCount = 0;
let longTaskMax = 0;
let longTaskTotal = 0;
let eventObserver = null;
let eventCount = 0;
let eventMax = 0;
let eventTotal = 0;

const getModeLabel = (mode) => (mode === 'high' ? 'High performance' : 'Balanced');

const setStatus = (mode) => {
    if (!statusEl) return;
    statusEl.textContent = `Performance mode: ${getModeLabel(mode)}.`;
};

const setCapabilities = () => {
    if (!capabilitiesEl) return;
    const webgpu = Boolean(navigator.gpu?.requestAdapter);
    const wasm = 'WebAssembly' in window;
    const audioWorklet = 'AudioWorkletNode' in window;
    const supported = (PerformanceObserver?.supportedEntryTypes || []);
    const eventTiming = supported.includes('event');
    const threads = Number.isFinite(navigator.hardwareConcurrency)
        ? `${navigator.hardwareConcurrency} threads`
        : 'threads unavailable';
    const dpr = window.devicePixelRatio ? window.devicePixelRatio.toFixed(2) : '1.00';
    const viewport = window.visualViewport
        ? `${Math.round(window.visualViewport.width)}×${Math.round(window.visualViewport.height)}`
        : `${window.innerWidth}×${window.innerHeight}`;
    const ipadosVersion = parseIPadOSVersion();
    const osLabel = ipadosVersion?.raw ? `iPadOS ${ipadosVersion.raw}` : 'iPadOS';
    const targetLabel = isIPadOS() ? 'Target: iPad mini 6 (A15)' : 'Target: iPad mini 6 (A15)';
    capabilitiesEl.textContent = [
        `Capabilities: ${osLabel}`,
        targetLabel,
        `WebGPU ${webgpu ? 'ready' : 'unavailable'}`,
        `WASM ${wasm ? 'ready' : 'unavailable'}`,
        `AudioWorklet ${audioWorklet ? 'ready' : 'unavailable'}`,
        `Event Timing ${eventTiming ? 'ready' : 'unavailable'}`,
        `CPU ${threads}`,
        `Viewport ${viewport}`,
        `DPR ${dpr}`,
    ].join(' · ');
};

const emitModeChange = (mode) => {
    document.dispatchEvent(new CustomEvent('panda:performance-mode-change', { detail: { mode } }));
};

const applyMode = (mode, persist = false) => {
    const nextMode = mode === 'high' ? 'high' : 'balanced';
    if (root) root.dataset.perfMode = nextMode;
    if (perfToggle) perfToggle.checked = nextMode === 'high';
    setStatus(nextMode);
    if (persist) {
        setJSON(PERF_KEY, { mode: nextMode, updated: Date.now() });
    }
    emitModeChange(nextMode);
};

const loadMode = async () => {
    const stored = await getJSON(PERF_KEY);
    return stored?.mode === 'high' ? 'high' : 'balanced';
};

const updateMetrics = () => {
    if (!metricsEl) return;
    const now = performance.now();
    const elapsed = now - sampleStart;
    if (elapsed <= 0 || frameCount === 0) {
        metricsEl.textContent = 'Diagnostics: collecting samples…';
        return;
    }
    const fps = Math.round((frameCount / elapsed) * 1000);
    const avgFrame = elapsed / frameCount;
    const longAvg = longTaskCount ? (longTaskTotal / longTaskCount) : 0;
    const longSummary = longTaskCount
        ? ` · ${longTaskCount} long tasks (avg ${longAvg.toFixed(0)} ms, max ${Math.round(longTaskMax)} ms)`
        : '';
    const eventAvg = eventCount ? (eventTotal / eventCount) : 0;
    const eventSummary = eventCount
        ? ` · ${eventCount} interactions (avg ${eventAvg.toFixed(0)} ms, max ${Math.round(eventMax)} ms)`
        : '';
    metricsEl.textContent = `Diagnostics: ~${fps} FPS · ${avgFrame.toFixed(1)} ms avg frame · ${slowFrames} slow frames${longSummary}${eventSummary}`;
    frameCount = 0;
    slowFrames = 0;
    sampleStart = now;
    longTaskCount = 0;
    longTaskMax = 0;
    longTaskTotal = 0;
    eventCount = 0;
    eventMax = 0;
    eventTotal = 0;
};

const trackFrame = (now) => {
    if (!monitoring) return;
    if (lastFrame) {
        const delta = now - lastFrame;
        frameCount += 1;
        if (delta > 50) slowFrames += 1;
    }
    lastFrame = now;
    monitorId = requestAnimationFrame(trackFrame);
};

const startMonitoring = () => {
    if (monitoring || !metricsEl) return;
    monitoring = true;
    frameCount = 0;
    slowFrames = 0;
    lastFrame = 0;
    sampleStart = performance.now();
    monitorId = requestAnimationFrame(trackFrame);
    reportId = window.setInterval(updateMetrics, 2000);
    const supported = (PerformanceObserver?.supportedEntryTypes || []);
    if (supported.includes('longtask')) {
        try {
            longTaskObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    longTaskCount += 1;
                    longTaskTotal += entry.duration || 0;
                    longTaskMax = Math.max(longTaskMax, entry.duration || 0);
                });
            });
            longTaskObserver.observe({ type: 'longtask', buffered: true });
        } catch {
            longTaskObserver = null;
        }
    }
    if (supported.includes('event')) {
        try {
            eventObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    const duration = Number(entry.duration) || 0;
                    if (!duration) return;
                    eventCount += 1;
                    eventTotal += duration;
                    eventMax = Math.max(eventMax, duration);
                });
            });
            eventObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
        } catch {
            eventObserver = null;
        }
    }
    updateMetrics();
};

const stopMonitoring = () => {
    if (!monitoring) return;
    monitoring = false;
    if (monitorId) cancelAnimationFrame(monitorId);
    if (reportId) window.clearInterval(reportId);
    monitorId = null;
    reportId = null;
    if (longTaskObserver) {
        longTaskObserver.disconnect();
        longTaskObserver = null;
    }
    if (eventObserver) {
        eventObserver.disconnect();
        eventObserver = null;
    }
    if (metricsEl) metricsEl.textContent = 'Diagnostics: paused.';
};

const isSettingsActive = (explicit) => getViewId(explicit) === 'view-settings';

const updateMonitoringState = (viewIdOverride = null) => {
    const shouldMonitor = Boolean(diagnosticsEl?.open) && isSettingsActive(viewIdOverride) && !document.hidden;
    if (shouldMonitor) startMonitoring();
    else stopMonitoring();
};


const init = async () => {
    const mode = await loadMode();
    applyMode(mode);
    setCapabilities();
    if (perfToggle) {
        perfToggle.addEventListener('change', () => {
            applyMode(perfToggle.checked ? 'high' : 'balanced', true);
        });
    }
    if (diagnosticsEl) {
        diagnosticsEl.addEventListener('toggle', updateMonitoringState);
    }
    onViewChange((viewId) => updateMonitoringState(viewId));
    window.addEventListener('resize', setCapabilities, { passive: true });
    window.visualViewport?.addEventListener('resize', setCapabilities, { passive: true });
    document.addEventListener('visibilitychange', updateMonitoringState);
    updateMonitoringState();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
