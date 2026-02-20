let statusEl = null;
let detailEl = null;
const root = document.documentElement;
let adapterProbePromise = null;
let adapterDetected = undefined;

const resolveElements = () => {
    statusEl = document.querySelector('.setting-note[data-ml-accel]') || document.querySelector('[data-ml-accel]');
    detailEl = document.querySelector('[data-ml-accel-detail]');
};

const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
};

const setDetail = (message) => {
    if (detailEl) detailEl.textContent = message;
};

const setDataset = (value) => {
    if (!value) {
        delete root.dataset.mlAccel;
        return;
    }
    root.dataset.mlAccel = value;
};

const applyMode = (mode) => {
    if (mode === 'webgpu') {
        setDataset('webgpu');
        setStatus('ML acceleration: WebGPU ready.');
        setDetail('On-device models can use GPU compute for faster offline updates.');
        return;
    }
    setDataset('wasm');
    setStatus('ML acceleration: WebAssembly ready.');
    setDetail('Offline models run with optimized on-device compute.');
};

const detectWebGPU = async () => {
    if (adapterDetected !== undefined) return adapterDetected;
    if (!adapterProbePromise) {
        adapterProbePromise = (async () => {
            if (!navigator.gpu?.requestAdapter) {
                adapterDetected = null;
                return adapterDetected;
            }
            try {
                adapterDetected = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
            } catch {
                adapterDetected = null;
            }
            return adapterDetected;
        })();
    }
    return adapterProbePromise;
};

const initAccelerator = async () => {
    resolveElements();

    if (adapterDetected !== undefined) {
        applyMode(adapterDetected ? 'webgpu' : 'wasm');
        return;
    }

    setStatus('ML acceleration: checking…');
    setDetail('');

    const adapter = await detectWebGPU();
    applyMode(adapter ? 'webgpu' : 'wasm');
};

export const init = initAccelerator;
