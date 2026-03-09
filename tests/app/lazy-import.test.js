import { describe, expect, it, vi } from 'vitest';
import { loadNamedExportWithRetry } from '../../src/app/lazy-import.js';

const expectRetrySuccess = async (error) => {
    const View = () => null;
    const load = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ GamesView: View });
    const wait = vi.fn(async () => {});

    await expect(loadNamedExportWithRetry({
        loader: load,
        exportName: 'GamesView',
        wait,
        retryDelayMs: 0,
        retriableAttempts: 1,
    })).resolves.toEqual({ default: View });

    expect(load).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
};

describe('app/lazy-import', () => {
    it('retries transient import errors once before resolving the named export', async () => {
        await expectRetrySuccess(new TypeError('Importing a module script failed.'));
    });

    it('retries transient CSS preload failures before resolving the named export', async () => {
        await expectRetrySuccess(new Error('Unable to preload CSS for /assets/SharedViewHeader.css'));
    });

    it('does not retry non-retriable lazy import failures', async () => {
        const error = new Error('Named export lookup failed.');
        const load = vi.fn().mockRejectedValue(error);
        const wait = vi.fn(async () => {});

        await expect(loadNamedExportWithRetry({
            loader: load,
            exportName: 'GamesView',
            wait,
            retryDelayMs: 0,
            retriableAttempts: 1,
        })).rejects.toBe(error);

        expect(load).toHaveBeenCalledTimes(1);
        expect(wait).not.toHaveBeenCalled();
    });

    it('fails immediately when the module is missing the requested export', async () => {
        const load = vi.fn().mockResolvedValue({ WrongView: () => null });

        await expect(loadNamedExportWithRetry({
            loader: load,
            exportName: 'GamesView',
            retryDelayMs: 0,
            retriableAttempts: 1,
        })).rejects.toThrow('Missing export "GamesView"');

        expect(load).toHaveBeenCalledTimes(1);
    });
});
