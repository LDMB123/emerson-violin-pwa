import { beforeEach, describe, expect, it, vi } from 'vitest';

const WEBGPU_CACHE_KEY = 'panda-violin:webgpu-availability:v1';

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
        vi.restoreAllMocks();
        mount();
        setGpu(undefined);
        sessionStorage.clear();
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

    it('falls back to default adapter probe when low-power adapter is unavailable', async () => {
        const requestAdapter = vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ name: 'default-adapter' });
        setGpu({ requestAdapter });

        const module = await import('../../src/ml/accelerator.js');
        await module.init();

        expect(requestAdapter).toHaveBeenCalledTimes(2);
        expect(requestAdapter).toHaveBeenNthCalledWith(1, { powerPreference: 'low-power' });
        expect(requestAdapter).toHaveBeenNthCalledWith(2);
        expect(document.documentElement.dataset.mlAccel).toBe('webgpu');
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

    it('uses cached WebGPU availability to skip adapter probing', async () => {
        const requestAdapter = vi.fn(async () => ({ name: 'low-power-adapter' }));
        setGpu({ requestAdapter });
        sessionStorage.setItem(
            WEBGPU_CACHE_KEY,
            JSON.stringify({
                available: true,
                timestamp: Date.now(),
            }),
        );

        const module = await import('../../src/ml/accelerator.js');
        await module.init();

        expect(requestAdapter).not.toHaveBeenCalled();
        expect(document.documentElement.dataset.mlAccel).toBe('webgpu');
    });

    it('ignores stale cache and re-probes adapter', async () => {
        const requestAdapter = vi.fn(async () => ({ name: 'low-power-adapter' }));
        setGpu({ requestAdapter });
        const now = 1_000_000;
        vi.spyOn(Date, 'now').mockReturnValue(now);
        sessionStorage.setItem(
            WEBGPU_CACHE_KEY,
            JSON.stringify({
                available: false,
                timestamp: now - ((6 * 60 * 60 * 1000) + 1),
            }),
        );

        const module = await import('../../src/ml/accelerator.js');
        await module.init();

        expect(requestAdapter).toHaveBeenCalledTimes(1);
        expect(document.documentElement.dataset.mlAccel).toBe('webgpu');
    });

    it('stores probe results for future init calls', async () => {
        const requestAdapter = vi.fn(async () => ({ name: 'low-power-adapter' }));
        setGpu({ requestAdapter });

        const module = await import('../../src/ml/accelerator.js');
        await module.init();

        const cached = JSON.parse(sessionStorage.getItem(WEBGPU_CACHE_KEY) || '{}');
        expect(cached.available).toBe(true);
        expect(typeof cached.timestamp).toBe('number');
    });
});
