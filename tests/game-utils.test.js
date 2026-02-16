import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GAME_META } from '../src/games/game-config.js';
import { formatMinutes, formatTime, createSessionTimer } from '../src/games/session-timer.js';

describe('GAME_META', () => {
    it('contains 13 games', () => {
        expect(Object.keys(GAME_META)).toHaveLength(13);
    });

    it('has required fields for each game', () => {
        for (const [id, meta] of Object.entries(GAME_META)) {
            expect(meta.skill, `${id} missing skill`).toBeTruthy();
            expect(meta.goal, `${id} missing goal`).toBeTruthy();
            expect(meta.targetMinutes, `${id} missing targetMinutes`).toBeGreaterThan(0);
            expect(meta.steps, `${id} missing steps`).toBeInstanceOf(Array);
            expect(meta.steps.length, `${id} has no steps`).toBeGreaterThan(0);
            expect(meta.tip, `${id} missing tip`).toBeTruthy();
        }
    });

    it('includes pitch-quest', () => {
        expect(GAME_META['pitch-quest']).toBeTruthy();
        expect(GAME_META['pitch-quest'].skill).toBe('Pitch');
    });

    it('includes duet-challenge', () => {
        expect(GAME_META['duet-challenge']).toBeTruthy();
        expect(GAME_META['duet-challenge'].skill).toBe('Rhythm');
    });
});

describe('formatMinutes', () => {
    it('formats whole minutes', () => {
        expect(formatMinutes(5)).toBe('5 min');
    });

    it('rounds fractional values', () => {
        expect(formatMinutes(2.7)).toBe('3 min');
    });

    it('clamps to minimum of 1', () => {
        expect(formatMinutes(0)).toBe('1 min');
        expect(formatMinutes(-5)).toBe('1 min');
    });

    it('handles null/undefined as 1 min', () => {
        expect(formatMinutes(null)).toBe('1 min');
        expect(formatMinutes(undefined)).toBe('1 min');
    });
});

describe('formatTime', () => {
    it('formats zero as 00:00', () => {
        expect(formatTime(0)).toBe('00:00');
    });

    it('formats seconds with padding', () => {
        expect(formatTime(5000)).toBe('00:05');
    });

    it('formats minutes and seconds', () => {
        expect(formatTime(90000)).toBe('01:30');
    });

    it('handles large values', () => {
        expect(formatTime(600000)).toBe('10:00');
    });

    it('clamps negative to 00:00', () => {
        expect(formatTime(-1000)).toBe('00:00');
    });
});

describe('createSessionTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('calls onUpdate after start', () => {
        const onUpdate = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate });
        timer.start();
        expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
            ms: expect.any(Number),
            percent: 0,
            complete: false,
            timeLabel: '00:00',
        }));
        timer.stop();
    });

    it('ticks every second', () => {
        const onUpdate = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate });
        timer.start();
        onUpdate.mockClear();
        vi.advanceTimersByTime(3000);
        expect(onUpdate).toHaveBeenCalledTimes(3);
        timer.stop();
    });

    it('reports halfway milestone', () => {
        const onMilestone = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate: vi.fn(), onMilestone });
        timer.start();
        vi.advanceTimersByTime(30000); // 30 seconds = half of 1 minute
        expect(onMilestone).toHaveBeenCalledWith('half', 'Halfway there');
        timer.stop();
    });

    it('reports end milestone', () => {
        const onMilestone = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate: vi.fn(), onMilestone });
        timer.start();
        vi.advanceTimersByTime(61000); // just past 1 minute
        expect(onMilestone).toHaveBeenCalledWith('end', 'Session complete');
        timer.stop();
    });

    it('stop prevents further ticks', () => {
        const onUpdate = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate });
        timer.start();
        timer.stop();
        onUpdate.mockClear();
        vi.advanceTimersByTime(5000);
        expect(onUpdate).not.toHaveBeenCalled();
    });

    it('reset clears state for re-use', () => {
        const onUpdate = vi.fn();
        const onMilestone = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate, onMilestone });
        timer.start();
        vi.advanceTimersByTime(61000);
        timer.reset();
        onMilestone.mockClear();
        timer.start();
        vi.advanceTimersByTime(30000);
        // Should fire 'half' again after reset
        expect(onMilestone).toHaveBeenCalledWith('half', 'Halfway there');
        timer.stop();
    });

    it('does not double-start', () => {
        const onUpdate = vi.fn();
        const timer = createSessionTimer({ targetMinutes: 1, onUpdate });
        timer.start();
        timer.start(); // second call should be no-op
        onUpdate.mockClear();
        vi.advanceTimersByTime(1000);
        expect(onUpdate).toHaveBeenCalledTimes(1); // not 2
        timer.stop();
    });
});
