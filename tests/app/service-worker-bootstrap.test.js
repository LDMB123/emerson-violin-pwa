import { beforeEach, describe, expect, it, vi } from 'vitest';

const swSupportMocks = vi.hoisted(() => ({
    canRegisterServiceWorker: vi.fn(() => true),
}));

vi.mock('../../src/platform/sw-support.js', () => swSupportMocks);

import { registerAppServiceWorker } from '../../src/app/service-worker-bootstrap.js';

describe('app/service-worker-bootstrap', () => {
    const flush = async () => {
        await Promise.resolve();
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
    };

    beforeEach(() => {
        window.sessionStorage.clear();
        swSupportMocks.canRegisterServiceWorker.mockReset();
        swSupportMocks.canRegisterServiceWorker.mockReturnValue(true);
        Object.defineProperty(document, 'readyState', {
            configurable: true,
            value: 'complete',
        });
    });

    it('cleans dev service workers, cache keys, and reset flag when not controlled', async () => {
        const unregister = vi.fn(async () => true);
        const getRegistrations = vi.fn(async () => [{ unregister }]);
        Object.defineProperty(navigator, 'serviceWorker', {
            configurable: true,
            value: {
                controller: null,
                getRegistrations,
            },
        });

        const deleteCache = vi.fn(async () => true);
        Object.defineProperty(window, 'caches', {
            configurable: true,
            value: {
                keys: vi.fn(async () => ['panda-violin-v1', 'workbox-precache', 'other']),
                delete: deleteCache,
            },
        });

        window.sessionStorage.setItem('panda-violin-dev-sw-reset', '1');

        registerAppServiceWorker();
        await flush();

        expect(getRegistrations).toHaveBeenCalledTimes(1);
        expect(unregister).toHaveBeenCalledTimes(1);
        expect(deleteCache).toHaveBeenCalledWith('panda-violin-v1');
        expect(deleteCache).toHaveBeenCalledWith('workbox-precache');
        expect(window.sessionStorage.getItem('panda-violin-dev-sw-reset')).toBeNull();
    });

    it('defers cleanup until load when document is not complete', async () => {
        const state = { value: 'loading' };
        Object.defineProperty(document, 'readyState', {
            configurable: true,
            get: () => state.value,
        });

        const getRegistrations = vi.fn(async () => []);
        Object.defineProperty(navigator, 'serviceWorker', {
            configurable: true,
            value: {
                controller: null,
                getRegistrations,
            },
        });

        const addListenerSpy = vi.spyOn(window, 'addEventListener');
        registerAppServiceWorker();
        expect(addListenerSpy).toHaveBeenCalledWith('load', expect.any(Function), { once: true });

        state.value = 'complete';
        window.dispatchEvent(new Event('load'));
        await flush();

        expect(getRegistrations).toHaveBeenCalledTimes(1);
    });
});
