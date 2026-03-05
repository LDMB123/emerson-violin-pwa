import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNoteMemoryTimer } from '../../src/games/note-memory-timer.js';

describe('games/note-memory-timer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(0);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const createHarness = ({ initialTimeLeft = 3, isViewActive = true } = {}) => {
        let timeLeft = initialTimeLeft;
        let ended = false;
        const setTimeLeft = vi.fn((next) => {
            timeLeft = next;
        });
        const setEnded = vi.fn((next) => {
            ended = next;
        });
        const clearLock = vi.fn();
        const updateHud = vi.fn();
        const finalizeGame = vi.fn();
        const setGameTimerId = vi.fn();

        const timer = createNoteMemoryTimer({
            getTimeLeft: () => timeLeft,
            setTimeLeft,
            getEnded: () => ended,
            setEnded,
            clearLock,
            updateHud,
            finalizeGame,
            setGameTimerId,
            isViewActive: () => isViewActive,
        });

        return {
            timer,
            setTimeLeft,
            setEnded,
            clearLock,
            updateHud,
            finalizeGame,
            setGameTimerId,
            getTimeLeft: () => timeLeft,
        };
    };

    it('publishes HUD changes only when second values change and finalizes once', () => {
        const h = createHarness({ initialTimeLeft: 3 });

        h.timer.startTimer();
        expect(h.setTimeLeft).toHaveBeenCalledTimes(1);
        expect(h.updateHud).toHaveBeenCalledTimes(1);
        expect(h.setGameTimerId).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(500);
        expect(h.setTimeLeft).toHaveBeenCalledTimes(1);
        expect(h.updateHud).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(600); // ~1.1s elapsed => 2s left
        expect(h.setTimeLeft).toHaveBeenCalledTimes(2);
        expect(h.setTimeLeft).toHaveBeenLastCalledWith(2);
        expect(h.updateHud).toHaveBeenCalledTimes(2);

        vi.advanceTimersByTime(1000); // ~2.1s elapsed => 1s left
        expect(h.setTimeLeft).toHaveBeenCalledTimes(3);
        expect(h.setTimeLeft).toHaveBeenLastCalledWith(1);

        vi.advanceTimersByTime(1000); // ~3.1s elapsed => 0s left
        expect(h.setTimeLeft).toHaveBeenCalledTimes(4);
        expect(h.setTimeLeft).toHaveBeenLastCalledWith(0);
        expect(h.setEnded).toHaveBeenCalledWith(true);
        expect(h.clearLock).toHaveBeenCalledTimes(1);
        expect(h.finalizeGame).toHaveBeenCalledTimes(1);
        expect(h.setGameTimerId).toHaveBeenLastCalledWith(null);
    });

    it('resumes only when still active and time remains', () => {
        const h = createHarness({ initialTimeLeft: 4, isViewActive: true });

        h.timer.startTimer();
        vi.advanceTimersByTime(1300); // drops to 3
        h.timer.pauseTimer();
        const callsAfterPause = h.setGameTimerId.mock.calls.length;

        vi.advanceTimersByTime(3000);
        expect(h.getTimeLeft()).toBe(3);

        h.timer.resumeTimer();
        expect(h.setGameTimerId.mock.calls.length).toBeGreaterThan(callsAfterPause);
        expect(h.timer.isRunning()).toBe(true);
    });
});
