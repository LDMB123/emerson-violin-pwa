import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createIntervalTicker } from '../../src/utils/interval-ticker.js';

describe('utils/interval-ticker', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts once, ticks, and stops cleanly', () => {
        const onTick = vi.fn();
        const ticker = createIntervalTicker({
            onTick,
            intervalMs: 1000,
        });

        expect(ticker.isRunning()).toBe(false);
        expect(ticker.start()).toBe(true);
        expect(ticker.isRunning()).toBe(true);
        expect(ticker.start()).toBe(false);

        vi.advanceTimersByTime(3000);
        expect(onTick).toHaveBeenCalledTimes(3);

        expect(ticker.stop()).toBe(true);
        expect(ticker.isRunning()).toBe(false);
        expect(ticker.stop()).toBe(false);
    });

    it('does not start without a callable tick handler', () => {
        const ticker = createIntervalTicker({
            onTick: null,
            intervalMs: 1000,
        });

        expect(ticker.start()).toBe(false);
        expect(ticker.isRunning()).toBe(false);
    });
});
