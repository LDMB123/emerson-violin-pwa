let statusEl = null;
let detailEl = null;
const root = document.documentElement;
let adapterProbePromise = null;
let webgpuAvailable;
const WEBGPU_CACHE_KEY = 'panda-violin:webgpu-availability:v1';
const WEBGPU_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const MODE_COPY = {
    checking: {
        status: 'ML acceleration: checking…',
        detail: '',
    },
    webgpu: {
        dataset: 'webgpu',
        status: 'ML acceleration: WebGPU ready.',
        detail: 'On-device models can use GPU compute for faster offline updates.',
    },
    wasm: {
        dataset: 'wasm',
        status: 'ML acceleration: WebAssembly ready.',
        detail: 'Offline models run with optimized on-device compute.',
    },
};

const resolveElements = () => {
    statusEl = document.querySelector('.setting-note[data-ml-accel]') || document.querySelector('[data-ml-accel]');
    detailEl = document.querySelector('[data-ml-accel-detail]');
};

const setStatus = (message) => {
    if (statusEl && statusEl.textContent !== message) {
        statusEl.textContent = message;
    }
};

const setDetail = (message) => {
    if (detailEl && detailEl.textContent !== message) {
        detailEl.textContent = message;
    }
};

const setDataset = (value) => {
    if (!value) {
        delete root.dataset.mlAccel;
        return;
    }
    if (root.dataset.mlAccel === value) return;
    root.dataset.mlAccel = value;
};

const readCachedWebGPUAvailability = () => {
    try {
        const raw = sessionStorage.getItem(WEBGPU_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.available !== 'boolean' || !Number.isFinite(parsed?.timestamp)) {
            sessionStorage.removeItem(WEBGPU_CACHE_KEY);
            return null;
        }
        if ((Date.now() - parsed.timestamp) > WEBGPU_CACHE_TTL_MS) {
            sessionStorage.removeItem(WEBGPU_CACHE_KEY);
            return null;
        }
        return parsed.available;
    } catch {
        return null;
    }
};

const writeCachedWebGPUAvailability = (available) => {
    try {
        sessionStorage.setItem(
            WEBGPU_CACHE_KEY,
            JSON.stringify({
                available: Boolean(available),
                timestamp: Date.now(),
            }),
        );
    } catch {
        // Ignore storage restrictions in private browsing and embedded contexts.
    }
};

const setWebGPUAvailability = (available, { persist = true } = {}) => {
    webgpuAvailable = Boolean(available);
    if (persist) writeCachedWebGPUAvailability(webgpuAvailable);
    return webgpuAvailable;
};

const applyMode = (mode) => {
    const copy = MODE_COPY[mode] || MODE_COPY.wasm;
    setDataset(copy.dataset || null);
    setStatus(copy.status);
    setDetail(copy.detail);
};

const detectWebGPU = async () => {
    if (typeof webgpuAvailable === 'boolean') return webgpuAvailable;
    const cachedAvailability = readCachedWebGPUAvailability();
    if (typeof cachedAvailability === 'boolean') {
        return setWebGPUAvailability(cachedAvailability, { persist: false });
    }
    if (!adapterProbePromise) {
        adapterProbePromise = (async () => {
            if (!navigator.gpu?.requestAdapter) {
                return setWebGPUAvailability(false);
            }
            try {
                // Prefer low-power adapters to reduce battery/thermal cost on Apple Silicon.
                const lowPowerAdapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
                if (lowPowerAdapter) {
                    return setWebGPUAvailability(true);
                }

                // Some browsers ignore low-power preference; retry with defaults for capability detection.
                const fallbackAdapter = await navigator.gpu.requestAdapter();
                return setWebGPUAvailability(Boolean(fallbackAdapter));
            } catch {
                return setWebGPUAvailability(false);
            }
        })().finally(() => {
            adapterProbePromise = null;
        });
    }
    return adapterProbePromise;
};

const initAccelerator = async () => {
    resolveElements();

    if (typeof webgpuAvailable === 'boolean') {
        applyMode(webgpuAvailable ? 'webgpu' : 'wasm');
        return;
    }

    applyMode('checking');

    const available = await detectWebGPU();
    applyMode(available ? 'webgpu' : 'wasm');
};

export const init = initAccelerator;
