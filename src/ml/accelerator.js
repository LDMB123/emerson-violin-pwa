let statusEl = null;
let detailEl = null;
const root = document.documentElement;
let adapterProbePromise = null;
let webgpuAvailable;

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

const applyMode = (mode) => {
    const copy = MODE_COPY[mode] || MODE_COPY.wasm;
    setDataset(copy.dataset || null);
    setStatus(copy.status);
    setDetail(copy.detail);
};

const detectWebGPU = async () => {
    if (typeof webgpuAvailable === 'boolean') return webgpuAvailable;
    if (!adapterProbePromise) {
        adapterProbePromise = (async () => {
            if (!navigator.gpu?.requestAdapter) {
                webgpuAvailable = false;
                return webgpuAvailable;
            }
            try {
                // Prefer low-power adapters to reduce battery/thermal cost on Apple Silicon.
                const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
                webgpuAvailable = Boolean(adapter);
            } catch {
                webgpuAvailable = false;
            }
            return webgpuAvailable;
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
