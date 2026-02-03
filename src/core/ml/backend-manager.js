import { getJSON, setJSON } from '../persistence/storage.js';
import { initWebGPUBackend, isWebGPUAvailable } from './webgpu-backend.js';
import { isWasmAvailable, warmWasmModules } from './wasm-backend.js';

const BACKEND_KEY = 'panda-violin:ml:backend-v1';
const toggle = document.querySelector('#setting-ml-gpu');
const accelStatusEl = document.querySelector('[data-ml-accel]');
const accelDetailEl = document.querySelector('[data-ml-accel-detail]');
const backendStatusEl = document.querySelector('[data-ml-backend-status]');
const root = document.documentElement;

let initPromise = null;
let lastState = {
    backend: 'basic',
    optIn: false,
    webgpuAvailable: false,
    wasmAvailable: false,
    perfMode: 'balanced',
};

const getPerfMode = () => root?.dataset?.perfMode || 'balanced';
const isPerfHigh = () => getPerfMode() === 'high';
const getPowerPreference = () => (isPerfHigh() ? 'high-performance' : 'low-power');

const setText = (el, text) => {
    if (el) el.textContent = text;
};

const describeAccel = ({ webgpuAvailable, wasmAvailable, optIn, perfMode }) => {
    if (webgpuAvailable) {
        if (!optIn) {
            return {
                status: 'ML acceleration: WebGPU available.',
                detail: 'Enable GPU ML to use WebGPU compute for on-device models.',
            };
        }
        if (perfMode !== 'high') {
            return {
                status: 'ML acceleration: WebGPU ready.',
                detail: 'Enable High performance mode to use GPU compute.',
            };
        }
        return {
            status: 'ML acceleration: WebGPU ready.',
            detail: 'GPU compute enabled for faster offline learning.',
        };
    }
    if (wasmAvailable) {
        return {
            status: 'ML acceleration: WebAssembly ready.',
            detail: 'Offline models run with optimized on-device compute.',
        };
    }
    return {
        status: 'ML acceleration: basic mode.',
        detail: 'Offline learning will use lightweight heuristics.',
    };
};

const describeBackend = (backend) => {
    if (backend === 'webgpu') return 'ML backend: WebGPU active.';
    if (backend === 'wasm') return 'ML backend: WebAssembly active.';
    return 'ML backend: basic heuristics.';
};

const resolveBackend = ({ webgpuAvailable, wasmAvailable, optIn, perfMode }) => {
    if (optIn && webgpuAvailable && perfMode === 'high') return 'webgpu';
    if (wasmAvailable) return 'wasm';
    return 'basic';
};

const updateUi = (state) => {
    const accel = describeAccel(state);
    setText(accelStatusEl, accel.status);
    setText(accelDetailEl, accel.detail);
    setText(backendStatusEl, describeBackend(state.backend));
};

const updateDataset = (state) => {
    if (!root) return;
    root.dataset.mlBackend = state.backend;
    root.dataset.mlAccel = state.webgpuAvailable ? 'webgpu' : state.wasmAvailable ? 'wasm' : 'basic';
};

const scheduleWarmup = (task) => {
    if (typeof window === 'undefined') return;
    if (document.prerendering) {
        document.addEventListener('prerenderingchange', () => scheduleWarmup(task), { once: true });
        return;
    }
    if (globalThis.scheduler?.postTask) {
        globalThis.scheduler.postTask(() => task(), { priority: 'background' });
        return;
    }
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => task(), { timeout: 1200 });
        return;
    }
    window.setTimeout(() => task(), 600);
};

const refreshBackend = async ({ persist = false, forceAdapterRefresh = false } = {}) => {
    const optIn = toggle ? toggle.checked : lastState.optIn;
    const perfMode = getPerfMode();
    const webgpuAvailable = await isWebGPUAvailable({
        powerPreference: getPowerPreference(),
        force: forceAdapterRefresh,
    });
    const wasmAvailable = isWasmAvailable();
    const backend = resolveBackend({ webgpuAvailable, wasmAvailable, optIn, perfMode });
    const nextState = { backend, optIn, webgpuAvailable, wasmAvailable, perfMode };

    updateDataset(nextState);
    updateUi(nextState);
    lastState = nextState;

    document.dispatchEvent(new CustomEvent('panda:ml-backend', { detail: nextState }));
    if (persist) {
        await setJSON(BACKEND_KEY, { backend, optIn, updatedAt: Date.now() });
    }

    if (webgpuAvailable) {
        scheduleWarmup(() => initWebGPUBackend({ powerPreference: getPowerPreference() }));
    }
    if (wasmAvailable) {
        scheduleWarmup(() => warmWasmModules());
    }
};

const loadSetting = async () => {
    const stored = await getJSON(BACKEND_KEY);
    const optIn = Boolean(stored?.optIn);
    if (toggle) toggle.checked = optIn;
    lastState.optIn = optIn;
    return optIn;
};

const initBackendManager = async () => {
    await loadSetting();
    await refreshBackend({ persist: false, forceAdapterRefresh: true });

    if (toggle) {
        toggle.addEventListener('change', () => {
            refreshBackend({ persist: true, forceAdapterRefresh: false });
        });
    }

    document.addEventListener('panda:performance-mode-change', () => {
        refreshBackend({ persist: false, forceAdapterRefresh: true });
    });
};

const runInit = () => {
    if (initPromise) return initPromise;
    initPromise = initBackendManager().finally(() => {
        initPromise = null;
    });
    return initPromise;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
} else {
    runInit();
}

export const ensureBackendReady = runInit;
export const getActiveBackend = () => lastState.backend || root?.dataset?.mlBackend || 'basic';
export const getBackendState = () => ({ ...lastState });
