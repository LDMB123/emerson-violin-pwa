let statusEl = null;
let detailEl = null;
const root = document.documentElement;

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

const detectWebGPU = async () => {
    if (!navigator.gpu?.requestAdapter) return null;
    try {
        return await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
    } catch {
        return null;
    }
};

const initAccelerator = async () => {
    resolveElements();
    setStatus('ML acceleration: checking…');
    setDetail('');

    const adapter = await detectWebGPU();
    if (adapter) {
        setDataset('webgpu');
        setStatus('ML acceleration: WebGPU ready.');
        setDetail('On-device models can use GPU compute for faster offline updates.');
        return;
    }

    setDataset('wasm');
    setStatus('ML acceleration: WebAssembly ready.');
    setDetail('Offline models run with optimized on-device compute.');
};

export const init = initAccelerator;
