import { describe, expect, it, vi } from 'vitest';
import { createBowHeroTimerLifecycle } from '../../src/games/bow-hero-timer.js';

describe('games/bow-hero-timer', () => {
    const createHarness = ({
        timeLimit = 3,
        canResumeValue = true,
    } = {}) => {
        let nowMs = 100;
        let intervalCallback = null;
        let nextTimerId = 1;
        let canResume = canResumeValue;
        const runToggle = { checked: true };
        const updateTimer = vi.fn();
        const setStatus = vi.fn();
        const onThirtySeconds = vi.fn();
        const onTimeElapsed = vi.fn();
        const setTimerHandle = vi.fn();
        const setIntervalFn = vi.fn((callback, delay) => {
            intervalCallback = callback;
            const id = nextTimerId++;
            setIntervalFn.lastDelay = delay;
            return id;
        });
        const clearIntervalFn = vi.fn();

        const lifecycle = createBowHeroTimerLifecycle({
            timeLimit,
            runToggle,
            shouldResetStarsBeforeStart: () => false,
            resetStars: vi.fn(),
            updateTimer,
            setStatus,
            onThirtySeconds,
            onTimeElapsed,
            setTimerHandle,
            canResume: () => canResume,
            now: () => nowMs,
            setIntervalFn,
            clearIntervalFn,
        });

        return {
            lifecycle,
            runToggle,
            updateTimer,
            setStatus,
            onThirtySeconds,
            onTimeElapsed,
            setTimerHandle,
            setIntervalFn,
            clearIntervalFn,
            stepTo: (nextNowMs) => {
                nowMs = nextNowMs;
                intervalCallback?.();
            },
            setCanResume: (value) => {
                canResume = value;
            },
        };
    };

    it('updates timer only when seconds change and stops at zero', () => {
        const h = createHarness({ timeLimit: 3 });

        expect(h.lifecycle.isRunning()).toBe(false);
        h.lifecycle.startTimer();
        expect(h.lifecycle.isRunning()).toBe(true);
        expect(h.setIntervalFn.lastDelay).toBe(500);
        expect(h.updateTimer).toHaveBeenCalledTimes(1);
        expect(h.updateTimer).toHaveBeenLastCalledWith(3);

        h.stepTo(300);
        expect(h.updateTimer).toHaveBeenCalledTimes(1);

        h.stepTo(1300);
        expect(h.updateTimer).toHaveBeenCalledTimes(2);
        expect(h.updateTimer).toHaveBeenLastCalledWith(2);

        h.stepTo(2300);
        expect(h.updateTimer).toHaveBeenCalledTimes(3);
        expect(h.updateTimer).toHaveBeenLastCalledWith(1);

        h.stepTo(3300);
        expect(h.updateTimer).toHaveBeenCalledTimes(4);
        expect(h.updateTimer).toHaveBeenLastCalledWith(0);
        expect(h.onTimeElapsed).toHaveBeenCalledTimes(1);
        expect(h.runToggle.checked).toBe(false);
        expect(h.clearIntervalFn).toHaveBeenCalledTimes(1);
        expect(h.lifecycle.isRunning()).toBe(false);
    });

    it('fires thirty-second marker only once per run', () => {
        const h = createHarness({ timeLimit: 40 });

        h.lifecycle.startTimer();
        h.stepTo(30150);
        h.stepTo(33000);
        h.stepTo(35000);

        expect(h.onThirtySeconds).toHaveBeenCalledTimes(1);
    });

    it('resumes only when allowed', () => {
        const h = createHarness({ timeLimit: 5, canResumeValue: false });

        h.lifecycle.startTimer();
        h.stepTo(2000);
        h.lifecycle.pauseTimer();
        expect(h.clearIntervalFn).toHaveBeenCalledTimes(1);
        expect(h.setStatus).toHaveBeenCalledWith('Paused while app is in the background.');

        h.lifecycle.resumeTimer();
        expect(h.setIntervalFn).toHaveBeenCalledTimes(1);

        h.setCanResume(true);
        h.lifecycle.resumeTimer();
        expect(h.setIntervalFn).toHaveBeenCalledTimes(2);
    });
});
