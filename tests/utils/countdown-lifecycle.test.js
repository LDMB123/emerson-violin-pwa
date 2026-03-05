import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCountdownLifecycle } from '../../src/utils/countdown-lifecycle.js';

describe('utils/countdown-lifecycle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(100);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const createHarness = ({
        initialRemaining = 3,
        canResumeValue = true,
    } = {}) => {
        let remaining = initialRemaining;
        let canResume = canResumeValue;

        const setRemainingSeconds = vi.fn((nextRemaining) => {
            remaining = nextRemaining;
        });
        const onPublish = vi.fn();
        const onElapsed = vi.fn();
        const setTimerHandle = vi.fn();

        const lifecycle = createCountdownLifecycle({
            getRemainingSeconds: () => remaining,
            setRemainingSeconds,
            onPublish,
            onElapsed,
            canResume: () => canResume,
            now: () => Date.now(),
            setTimerHandle,
        });

        return {
            lifecycle,
            onPublish,
            onElapsed,
            setRemainingSeconds,
            setTimerHandle,
            advanceBy: (milliseconds) => {
                vi.advanceTimersByTime(milliseconds);
            },
            setCanResume: (value) => {
                canResume = value;
            },
        };
    };

    it('publishes distinct remaining values and clears timer handles on elapsed', () => {
        const h = createHarness({ initialRemaining: 3 });

        h.lifecycle.start({ resetPublished: true });
        expect(h.setTimerHandle).toHaveBeenCalledTimes(1);
        expect(h.setTimerHandle.mock.calls[0][0]).not.toBe(null);
        expect(h.onPublish).toHaveBeenNthCalledWith(1, 3);

        h.advanceBy(200);
        expect(h.onPublish).toHaveBeenCalledTimes(1);

        h.advanceBy(1000);
        expect(h.onPublish).toHaveBeenNthCalledWith(2, 2);

        h.advanceBy(1000);
        expect(h.onPublish).toHaveBeenNthCalledWith(3, 1);

        h.advanceBy(1000);
        expect(h.onPublish).toHaveBeenNthCalledWith(4, 0);
        expect(h.onElapsed).toHaveBeenCalledTimes(1);
        expect(h.setTimerHandle).toHaveBeenLastCalledWith(null);
    });

    it('can resume with or without republishing the current remaining value', () => {
        const h = createHarness({ initialRemaining: 4 });

        h.lifecycle.start({ resetPublished: true });
        h.advanceBy(1200);
        expect(h.onPublish).toHaveBeenNthCalledWith(2, 3);

        h.lifecycle.pause();
        expect(h.setTimerHandle).toHaveBeenLastCalledWith(null);

        h.lifecycle.resume();
        expect(h.onPublish).toHaveBeenCalledTimes(2);

        h.lifecycle.pause();
        h.lifecycle.resume({ resetPublished: true });
        expect(h.onPublish).toHaveBeenCalledTimes(3);
        expect(h.onPublish).toHaveBeenLastCalledWith(3);

        h.setCanResume(false);
        h.lifecycle.pause();
        expect(h.lifecycle.resume()).toBe(false);
    });
});
