import { describe, expect, it, vi } from 'vitest';
import { tryRun, tryRunAsync } from '../../src/utils/safe-execution.js';

describe('utils/safe-execution', () => {
    it('returns true when synchronous operations succeed', () => {
        const operation = vi.fn();
        const result = tryRun(operation);

        expect(result).toBe(true);
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('returns fallback when synchronous operations throw', () => {
        const operation = vi.fn(() => {
            throw new Error('boom');
        });

        expect(tryRun(operation)).toBe(false);
        expect(tryRun(operation, true)).toBe(true);
    });

    it('returns true for successful async operations', async () => {
        const asyncOp = vi.fn(async () => Promise.resolve('ok'));
        const syncOp = vi.fn(() => 'ok');

        await expect(tryRunAsync(asyncOp)).resolves.toBe(true);
        await expect(tryRunAsync(syncOp)).resolves.toBe(true);
    });

    it('returns fallback for failed async operations', async () => {
        const rejected = vi.fn(async () => Promise.reject(new Error('bad')));
        const thrown = vi.fn(() => {
            throw new Error('bad');
        });

        await expect(tryRunAsync(rejected)).resolves.toBe(false);
        await expect(tryRunAsync(thrown, true)).resolves.toBe(true);
    });
});
