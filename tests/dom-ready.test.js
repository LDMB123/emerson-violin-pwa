import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('whenReady', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('calls fn immediately when readyState is not loading', async () => {
        const { whenReady } = await import('../src/utils/dom-ready.js');
        const fn = vi.fn();
        whenReady(fn);
        expect(fn).toHaveBeenCalledOnce();
    });

    it('registers DOMContentLoaded listener when readyState is loading', async () => {
        const addSpy = vi.spyOn(document, 'addEventListener');
        Object.defineProperty(document, 'readyState', {
            value: 'loading',
            writable: true,
            configurable: true,
        });

        const { whenReady } = await import('../src/utils/dom-ready.js');
        const fn = vi.fn();
        whenReady(fn);
        expect(fn).not.toHaveBeenCalled();
        expect(addSpy).toHaveBeenCalledWith('DOMContentLoaded', fn);

        addSpy.mockRestore();
        Object.defineProperty(document, 'readyState', {
            value: 'complete',
            writable: true,
            configurable: true,
        });
    });
});
