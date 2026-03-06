import { beforeEach, describe, expect, it, vi } from 'vitest';

const pandaCoreMocks = vi.hoisted(() => ({
    init: vi.fn(),
}));

vi.mock('../../src/wasm/panda_core.js', () => ({
    default: pandaCoreMocks.init,
    mocked: true,
}));

describe('wasm/load-core', () => {
    beforeEach(() => {
        vi.resetModules();
        pandaCoreMocks.init.mockReset();
    });

    it('deduplicates concurrent WASM initialization', async () => {
        let resolveInit;
        pandaCoreMocks.init.mockImplementation(() => new Promise((resolve) => {
            resolveInit = resolve;
        }));

        const { getCore } = await import('../../src/wasm/load-core.js');
        const firstLoad = getCore();
        const secondLoad = getCore();

        await vi.waitFor(() => {
            expect(pandaCoreMocks.init).toHaveBeenCalledTimes(1);
        });

        resolveInit();
        const [firstModule, secondModule] = await Promise.all([firstLoad, secondLoad]);

        expect(firstModule).toBe(secondModule);
        expect(firstModule.mocked).toBe(true);
        expect(firstModule.default).toBe(pandaCoreMocks.init);
    });

    it('retries initialization after a failed attempt', async () => {
        pandaCoreMocks.init
            .mockImplementationOnce(async () => {
                throw new Error('wasm init failed');
            })
            .mockResolvedValueOnce(undefined);

        const { getCore } = await import('../../src/wasm/load-core.js');

        let firstError = null;
        try {
            await getCore();
        } catch (error) {
            firstError = error;
        }

        expect(firstError).toBeInstanceOf(Error);
        expect(firstError?.message).toContain('wasm init failed');
        const secondAttempt = await getCore();
        expect(secondAttempt.mocked).toBe(true);
        expect(secondAttempt.default).toBe(pandaCoreMocks.init);
        expect(pandaCoreMocks.init).toHaveBeenCalledTimes(2);
    });
});
