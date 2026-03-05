import { describe, expect, it, vi } from 'vitest';
import { createModuleLoader } from '../../src/app/module-loader.js';

const createHarness = (overrides = {}) => {
    let nowValue = 1_000;
    const wait = vi.fn(async () => {});
    const warn = vi.fn();
    const moduleLoaders = overrides.moduleLoaders || {};

    const loader = createModuleLoader({
        moduleLoaders,
        warn,
        now: () => nowValue,
        wait,
        retryDelayMs: 0,
        ...overrides.options,
    });

    return {
        loader,
        warn,
        wait,
        setNow: (value) => {
            nowValue = value;
        },
    };
};

describe('app/module-loader', () => {
    it('returns null for unknown modules', async () => {
        const { loader } = createHarness();
        await expect(loader.loadModule('missing-module')).resolves.toBe(null);
    });

    it('coalesces concurrent loads into a single in-flight promise', async () => {
        const module = { init: vi.fn() };
        const load = vi.fn(async () => module);
        const { loader } = createHarness({
            moduleLoaders: { test: load },
        });

        const [first, second] = await Promise.all([
            loader.loadModule('test'),
            loader.loadModule('test'),
        ]);

        expect(load).toHaveBeenCalledTimes(1);
        expect(first).toBe(module);
        expect(second).toBe(module);
    });

    it('returns cached module on subsequent loads without re-importing', async () => {
        const module = { init: vi.fn() };
        const load = vi.fn(async () => module);
        const { loader } = createHarness({
            moduleLoaders: { test: load },
        });

        const first = await loader.loadModule('test');
        const second = await loader.loadModule('test');

        expect(load).toHaveBeenCalledTimes(1);
        expect(first).toBe(module);
        expect(second).toBe(module);
    });

    it('retries transient import errors once before reporting failure', async () => {
        const module = { init: vi.fn() };
        const load = vi
            .fn()
            .mockRejectedValueOnce(new TypeError('Importing a module script failed.'))
            .mockResolvedValueOnce(module);
        const { loader, wait, warn } = createHarness({
            moduleLoaders: { songs: load },
            options: {
                retriableAttempts: 1,
            },
        });

        await expect(loader.loadModule('songs')).resolves.toBe(module);
        expect(load).toHaveBeenCalledTimes(2);
        expect(wait).toHaveBeenCalledTimes(1);
        expect(warn).not.toHaveBeenCalled();
    });

    it('applies cooldown backoff after repeated failures', async () => {
        const load = vi.fn(async () => {
            throw new TypeError('Importing a module script failed.');
        });
        const { loader, setNow, warn } = createHarness({
            moduleLoaders: { songs: load },
            options: {
                baseCooldownMs: 1000,
                maxCooldownMs: 4000,
                retriableAttempts: 0,
            },
        });

        await expect(loader.loadModule('songs')).resolves.toBe(null);
        expect(load).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledTimes(1);

        // Within cooldown: skip load attempt
        setNow(1_500);
        await expect(loader.loadModule('songs')).resolves.toBe(null);
        expect(load).toHaveBeenCalledTimes(1);

        // After cooldown: retry and back off to 2x cooldown
        setNow(2_100);
        await expect(loader.loadModule('songs')).resolves.toBe(null);
        expect(load).toHaveBeenCalledTimes(2);
        expect(warn).toHaveBeenCalledTimes(2);

        // New cooldown is 2s; still within cooldown window
        setNow(3_500);
        await expect(loader.loadModule('songs')).resolves.toBe(null);
        expect(load).toHaveBeenCalledTimes(2);

        // Cooldown elapsed again; attempt 3
        setNow(4_200);
        await expect(loader.loadModule('songs')).resolves.toBe(null);
        expect(load).toHaveBeenCalledTimes(3);
        expect(warn).toHaveBeenCalledTimes(3);
    });
});
