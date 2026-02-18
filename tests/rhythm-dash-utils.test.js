import { describe, it, expect } from 'vitest';
import {
    computeBeatInterval,
    computeBpm,
    computeTimingScore,
    getRatingFromScore,
    computeNextCombo,
    computeBaseScore,
    computeScoreIncrement,
    computeAverageFromHistory,
    computeAccuracyFromTimingScores,
    computeAccuracyFromBpmHistory,
    getMetronomeNote,
    getMetronomeVolume,
    shouldMarkTapMilestone,
    shouldMarkComboMilestone,
    shouldMarkEnduranceMilestone,
    shouldShowComboStatus,
    formatComboStatus,
    formatRegularStatus,
} from '../src/utils/rhythm-dash-utils.js';

describe('rhythm-dash-utils', () => {
    describe('computeBeatInterval', () => {
        it('converts BPM to milliseconds', () => {
            expect(computeBeatInterval(60)).toBe(1000);
        });

        it('handles 120 BPM', () => {
            expect(computeBeatInterval(120)).toBe(500);
        });

        it('handles 90 BPM', () => {
            expect(computeBeatInterval(90)).toBeCloseTo(666.67, 1);
        });

        it('protects against division by zero', () => {
            expect(computeBeatInterval(0)).toBe(60000);
        });
    });

    describe('computeBpm', () => {
        it('converts delta to BPM', () => {
            expect(computeBpm(1000)).toBe(60);
        });

        it('handles 500ms delta', () => {
            expect(computeBpm(500)).toBe(120);
        });

        it('clamps to minimum 50', () => {
            expect(computeBpm(5000)).toBe(50);
        });

        it('clamps to maximum 160', () => {
            expect(computeBpm(300)).toBe(160);
        });

        it('returns 0 for zero delta', () => {
            expect(computeBpm(0)).toBe(0);
        });

        it('returns 0 for negative delta', () => {
            expect(computeBpm(-100)).toBe(0);
        });
    });

    describe('computeTimingScore', () => {
        it('returns 1 for perfect timing', () => {
            expect(computeTimingScore(500, 500)).toBe(1);
        });

        it('returns lower score for deviation', () => {
            const score = computeTimingScore(550, 500);
            expect(score).toBeLessThan(1);
            expect(score).toBeGreaterThan(0.8);
        });

        it('returns 0 for zero delta', () => {
            expect(computeTimingScore(0, 500)).toBe(0);
        });

        it('clamps to minimum 0', () => {
            const score = computeTimingScore(1000, 500);
            expect(score).toBe(0);
        });

        it('clamps to maximum 1', () => {
            const score = computeTimingScore(500, 500);
            expect(score).toBe(1);
        });
    });

    describe('getRatingFromScore', () => {
        it('returns Perfect for 0.9+', () => {
            const result = getRatingFromScore(0.95);
            expect(result.rating).toBe('Perfect');
            expect(result.level).toBe('perfect');
        });

        it('returns Great for 0.75-0.89', () => {
            const result = getRatingFromScore(0.8);
            expect(result.rating).toBe('Great');
            expect(result.level).toBe('great');
        });

        it('returns Good for 0.6-0.74', () => {
            const result = getRatingFromScore(0.65);
            expect(result.rating).toBe('Good');
            expect(result.level).toBe('good');
        });

        it('returns Off for below 0.6', () => {
            const result = getRatingFromScore(0.5);
            expect(result.rating).toBe('Off');
            expect(result.level).toBe('off');
        });

        it('returns Off for 0', () => {
            const result = getRatingFromScore(0);
            expect(result.rating).toBe('Off');
            expect(result.level).toBe('off');
        });
    });

    describe('computeNextCombo', () => {
        it('increments combo for good timing', () => {
            expect(computeNextCombo(5, 0.8)).toBe(6);
        });

        it('resets to 1 for bad timing', () => {
            expect(computeNextCombo(10, 0.5)).toBe(1);
        });

        it('starts combo at 1 from 0', () => {
            expect(computeNextCombo(0, 0.8)).toBe(1);
        });

        it('maintains threshold at 0.6', () => {
            expect(computeNextCombo(5, 0.6)).toBe(6);
            expect(computeNextCombo(5, 0.59)).toBe(1);
        });
    });

    describe('computeBaseScore', () => {
        it('returns 22 for perfect', () => {
            expect(computeBaseScore(0.95)).toBe(22);
        });

        it('returns 16 for great', () => {
            expect(computeBaseScore(0.8)).toBe(16);
        });

        it('returns 12 for good', () => {
            expect(computeBaseScore(0.65)).toBe(12);
        });

        it('returns 6 for off', () => {
            expect(computeBaseScore(0.5)).toBe(6);
        });
    });

    describe('computeScoreIncrement', () => {
        it('combines base score and combo bonus', () => {
            expect(computeScoreIncrement(0.95, 5)).toBe(22 + 10);
        });

        it('handles combo of 0', () => {
            expect(computeScoreIncrement(0.95, 0)).toBe(22);
        });

        it('scales with combo', () => {
            expect(computeScoreIncrement(0.8, 3)).toBe(16 + 6);
        });
    });

    describe('computeAverageFromHistory', () => {
        it('returns 0 for empty history', () => {
            expect(computeAverageFromHistory([])).toBe(0);
        });

        it('calculates average', () => {
            expect(computeAverageFromHistory([100, 110, 90])).toBe(100);
        });

        it('rounds to integer', () => {
            expect(computeAverageFromHistory([100, 101])).toBe(101);
        });
    });

    describe('computeAccuracyFromTimingScores', () => {
        it('returns 0 for empty scores', () => {
            expect(computeAccuracyFromTimingScores([])).toBe(0);
        });

        it('converts average to percentage', () => {
            const result = computeAccuracyFromTimingScores([0.8, 0.9, 0.85]);
            expect(result).toBeCloseTo(85, 0);
        });

        it('clamps to 100', () => {
            expect(computeAccuracyFromTimingScores([1, 1, 1])).toBe(100);
        });

        it('clamps to 0', () => {
            expect(computeAccuracyFromTimingScores([0, 0, 0])).toBe(0);
        });
    });

    describe('computeAccuracyFromBpmHistory', () => {
        it('returns 0 for empty history', () => {
            expect(computeAccuracyFromBpmHistory([], 90)).toBe(0);
        });

        it('returns 100 for perfect match', () => {
            const result = computeAccuracyFromBpmHistory([90, 90, 90], 90);
            expect(result).toBe(100);
        });

        it('returns lower score for deviation', () => {
            const result = computeAccuracyFromBpmHistory([80, 85, 90], 90);
            expect(result).toBeLessThan(100);
            expect(result).toBeGreaterThan(80);
        });

        it('clamps to 0-100 range', () => {
            const result = computeAccuracyFromBpmHistory([180], 90);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(100);
        });
    });

    describe('metronome functions', () => {
        describe('getMetronomeNote', () => {
            it('returns E for strong beat', () => {
                expect(getMetronomeNote(0)).toBe('E');
                expect(getMetronomeNote(4)).toBe('E');
            });

            it('returns A for weak beat', () => {
                expect(getMetronomeNote(1)).toBe('A');
                expect(getMetronomeNote(3)).toBe('A');
            });
        });

        describe('getMetronomeVolume', () => {
            it('returns 0.18 for strong beat', () => {
                expect(getMetronomeVolume(0)).toBe(0.18);
            });

            it('returns 0.12 for weak beat', () => {
                expect(getMetronomeVolume(1)).toBe(0.12);
            });
        });
    });

    describe('milestone functions', () => {
        describe('shouldMarkTapMilestone', () => {
            it('returns false for fewer than 8 taps', () => {
                expect(shouldMarkTapMilestone(7)).toBe(false);
            });

            it('returns true for 8 taps', () => {
                expect(shouldMarkTapMilestone(8)).toBe(true);
            });

            it('returns true for more than 8 taps', () => {
                expect(shouldMarkTapMilestone(10)).toBe(true);
            });
        });

        describe('shouldMarkComboMilestone', () => {
            it('returns false for combo below 10', () => {
                expect(shouldMarkComboMilestone(9)).toBe(false);
            });

            it('returns true for combo 10', () => {
                expect(shouldMarkComboMilestone(10)).toBe(true);
            });

            it('returns true for combo above 10', () => {
                expect(shouldMarkComboMilestone(15)).toBe(true);
            });
        });

        describe('shouldMarkEnduranceMilestone', () => {
            it('returns true for 16 taps', () => {
                expect(shouldMarkEnduranceMilestone(16, 0)).toBe(true);
            });

            it('returns true for 20 seconds', () => {
                expect(shouldMarkEnduranceMilestone(0, 20000)).toBe(true);
            });

            it('returns false for neither condition', () => {
                expect(shouldMarkEnduranceMilestone(10, 10000)).toBe(false);
            });
        });
    });

    describe('status functions', () => {
        describe('shouldShowComboStatus', () => {
            it('returns false for combo below 3', () => {
                expect(shouldShowComboStatus(2)).toBe(false);
            });

            it('returns true for combo 3', () => {
                expect(shouldShowComboStatus(3)).toBe(true);
            });

            it('returns true for combo above 3', () => {
                expect(shouldShowComboStatus(5)).toBe(true);
            });
        });

        describe('formatComboStatus', () => {
            it('formats combo status message', () => {
                const result = formatComboStatus('Perfect', 5);
                expect(result).toBe('Nice streak! Perfect timing · Combo x5.');
            });
        });

        describe('formatRegularStatus', () => {
            it('formats regular status message', () => {
                const result = formatRegularStatus('Great');
                expect(result).toBe('Timing: Great. Keep the beat steady.');
            });
        });
    });
});
