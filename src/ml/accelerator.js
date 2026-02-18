const statusEl = document.querySelector('[data-ml-accel]');
const detailEl = document.querySelector('[data-ml-accel-detail]');
const root = document.documentElement;

const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
};

const setDetail = (message) => {
    if (detailEl) detailEl.textContent = message;
};

const setDataset = (value) => {
    if (!root) return;
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

const init = async () => {
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
