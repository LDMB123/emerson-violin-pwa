import { beforeEach, describe, expect, it, vi } from 'vitest';

const setGpu = (gpu) => {
    Object.defineProperty(navigator, 'gpu', {
        configurable: true,
        writable: true,
        value: gpu,
    });
};

const mount = () => {
    document.documentElement.removeAttribute('data-ml-accel');
    document.body.innerHTML = `
        <div id="ml-accel-status" class="setting-note" data-ml-accel></div>
        <div id="ml-accel-detail" data-ml-accel-detail></div>
    `;
};

const statusText = () => document.querySelector('#ml-accel-status')?.textContent || '';
const detailText = () => document.querySelector('#ml-accel-detail')?.textContent || '';

describe('ml/accelerator', () => {
    beforeEach(() => {
        vi.resetModules();
        mount();
        setGpu(undefined);
    });

    it('falls back to wasm when WebGPU is unavailable', async () => {
        const module = await import('../../src/ml/accelerator.js');
        await module.init();

        expect(document.documentElement.dataset.mlAccel).toBe('wasm');
        expect(statusText()).toBe('ML acceleration: WebAssembly ready.');
        expect(detailText()).toContain('optimized on-device compute');
    });

    it('uses WebGPU mode when adapter is available', async () => {
        const requestAdapter = vi.fn(async () => ({ name: 'low-power-adapter' }));
        setGpu({ requestAdapter });

        const module = await import('../../src/ml/accelerator.js');
        await module.init();

        expect(requestAdapter).toHaveBeenCalledWith({ powerPreference: 'low-power' });
        expect(document.documentElement.dataset.mlAccel).toBe('webgpu');
        expect(statusText()).toBe('ML acceleration: WebGPU ready.');
    });

    it('caches detection result across repeated init calls', async () => {
        const requestAdapter = vi.fn(async () => ({ name: 'low-power-adapter' }));
        setGpu({ requestAdapter });

        const module = await import('../../src/ml/accelerator.js');
        await module.init();
        await module.init();

        expect(requestAdapter).toHaveBeenCalledTimes(1);
        expect(document.documentElement.dataset.mlAccel).toBe('webgpu');
    });

    it('falls back to wasm if adapter probe throws', async () => {
        const requestAdapter = vi.fn(async () => {
            throw new Error('probe failed');
        });
        setGpu({ requestAdapter });

        const module = await import('../../src/ml/accelerator.js');
        await module.init();

        expect(requestAdapter).toHaveBeenCalledTimes(1);
        expect(document.documentElement.dataset.mlAccel).toBe('wasm');
        expect(statusText()).toBe('ML acceleration: WebAssembly ready.');
    });
});
