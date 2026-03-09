import { describe, expect, it, vi } from 'vitest';

import { createRetryableModuleLoader } from '../../src/utils/lazy-module.js';

describe('createRetryableModuleLoader', () => {
    it('dedupes concurrent successful loads', async () => {
        const loadModule = vi.fn(async () => ({ value: 1 }));
        const loadOnce = createRetryableModuleLoader(loadModule);

        const [first, second] = await Promise.all([loadOnce(), loadOnce()]);

        expect(first).toEqual({ value: 1 });
        expect(second).toEqual({ value: 1 });
        expect(loadModule).toHaveBeenCalledTimes(1);
    });

    it('resets the cached promise after a rejection', async () => {
        const loadModule = vi
            .fn()
            .mockRejectedValueOnce(new Error('temporary'))
            .mockResolvedValueOnce({ value: 2 });
        const loadOnce = createRetryableModuleLoader(loadModule);

        await expect(loadOnce()).rejects.toThrow('temporary');
        await expect(loadOnce()).resolves.toEqual({ value: 2 });
        expect(loadModule).toHaveBeenCalledTimes(2);
    });
});
