import { describe, it, expect } from 'vitest';
import {
    isPracticeView,
    calculateMetronomeBpm,
    calculateMetronomeInterval,
    clampBpm,
    calculateMetronomeAccuracy,
    calculatePostureAccuracy,
    calculatePostureScore,
    calculateBowingAccuracy,
    calculateBowingScore,
    formatPostureHint,
    formatBowingIntroText,
    shouldClearTapTimes,
    isBfcachePagehide
} from '../src/trainer/trainer-utils.js';

describe('trainer-utils', () => {
    describe('isPracticeView', () => {
        it('returns true for game views', () => {
            expect(isPracticeView('view-game-scales')).toBe(true);
            expect(isPracticeView('view-game-pitch')).toBe(true);
        });

        it('returns true for song views', () => {
            expect(isPracticeView('view-song-twinkle')).toBe(true);
            expect(isPracticeView('view-song-mary')).toBe(true);
        });

        it('returns true for trainer practice views', () => {
            expect(isPracticeView('view-coach')).toBe(true);
            expect(isPracticeView('view-games')).toBe(true);
            expect(isPracticeView('view-songs')).toBe(true);
            expect(isPracticeView('view-trainer')).toBe(true);
            expect(isPracticeView('view-tuner')).toBe(true);
            expect(isPracticeView('view-bowing')).toBe(true);
            expect(isPracticeView('view-posture')).toBe(true);
        });

        it('returns false for non-practice views', () => {
            expect(isPracticeView('view-home')).toBe(false);
            expect(isPracticeView('view-settings')).toBe(false);
            expect(isPracticeView('view-about')).toBe(false);
        });

        it('handles empty string as non-practice view', () => {
            expect(isPracticeView('')).toBe(false);
        });
    });

    describe('calculateMetronomeBpm', () => {
        it('calculates BPM from tap intervals', () => {
            const intervals = [500, 500, 500]; // 500ms = 120 BPM
            expect(calculateMetronomeBpm(intervals)).toBe(120);
        });

        it('rounds to nearest integer', () => {
            const intervals = [550, 550]; // ~109.09 BPM
            expect(calculateMetronomeBpm(intervals)).toBe(109);
        });

        it('handles single interval', () => {
            const intervals = [1000]; // 60 BPM
            expect(calculateMetronomeBpm(intervals)).toBe(60);
        });

        it('averages multiple intervals', () => {
            const intervals = [400, 600]; // avg 500ms = 120 BPM
            expect(calculateMetronomeBpm(intervals)).toBe(120);
        });
    });

    describe('calculateMetronomeInterval', () => {
        it('converts BPM to milliseconds interval', () => {
            expect(calculateMetronomeInterval(60)).toBe(1000);
            expect(calculateMetronomeInterval(120)).toBe(500);
        });

        it('rounds to nearest integer', () => {
            expect(calculateMetronomeInterval(90)).toBe(667);
        });
    });

    describe('clampBpm', () => {
        it('clamps BPM within valid range', () => {
            expect(clampBpm(100)).toBe(100);
            expect(clampBpm(30)).toBe(50);
            expect(clampBpm(200)).toBe(140);
        });

        it('handles edge cases', () => {
            expect(clampBpm(50)).toBe(50);
            expect(clampBpm(140)).toBe(140);
        });
    });

    describe('calculateMetronomeAccuracy', () => {
        it('calculates accuracy percentage', () => {
            expect(calculateMetronomeAccuracy(100, 100)).toBe(100);
            expect(calculateMetronomeAccuracy(90, 100)).toBe(90);
            expect(calculateMetronomeAccuracy(110, 100)).toBe(90);
        });

        it('clamps accuracy to 0-100 range', () => {
            expect(calculateMetronomeAccuracy(200, 100)).toBe(0);
            expect(calculateMetronomeAccuracy(50, 100)).toBe(50);
        });

        it('handles zero target BPM gracefully', () => {
            expect(calculateMetronomeAccuracy(100, 0)).toBe(0);
        });
    });

    describe('calculatePostureAccuracy', () => {
        it('calculates posture accuracy percentage', () => {
            expect(calculatePostureAccuracy(2, 2)).toBe(100);
            expect(calculatePostureAccuracy(1, 2)).toBe(50);
            expect(calculatePostureAccuracy(3, 2)).toBe(100);
        });

        it('clamps to 0-100 range', () => {
            expect(calculatePostureAccuracy(0, 2)).toBe(0);
            expect(calculatePostureAccuracy(5, 2)).toBe(100);
        });
    });

    describe('calculatePostureScore', () => {
        it('calculates posture score based on count', () => {
            expect(calculatePostureScore(1)).toBe(20);
            expect(calculatePostureScore(2)).toBe(40);
            expect(calculatePostureScore(5)).toBe(100);
        });

        it('handles zero count', () => {
            expect(calculatePostureScore(0)).toBe(0);
        });
    });

    describe('calculateBowingAccuracy', () => {
        it('calculates bowing accuracy percentage', () => {
            expect(calculateBowingAccuracy(3, 3)).toBe(100);
            expect(calculateBowingAccuracy(2, 3)).toBeCloseTo(66.67, 1);
            expect(calculateBowingAccuracy(4, 3)).toBe(100);
        });

        it('clamps to 0-100 range', () => {
            expect(calculateBowingAccuracy(0, 3)).toBe(0);
        });
    });

    describe('calculateBowingScore', () => {
        it('calculates bowing score based on completed sets', () => {
            expect(calculateBowingScore(1)).toBe(25);
            expect(calculateBowingScore(3)).toBe(75);
            expect(calculateBowingScore(4)).toBe(100);
        });

        it('handles zero completed sets', () => {
            expect(calculateBowingScore(0)).toBe(0);
        });
    });

    describe('formatPostureHint', () => {
        it('formats hint for zero count', () => {
            const hint = formatPostureHint(0, 2);
            expect(hint).toBe('Suggested: 2 snapshots this week. Photos stay on your device.');
        });

        it('formats hint for single target', () => {
            const hint = formatPostureHint(0, 1);
            expect(hint).toBe('Suggested: 1 snapshot this week. Photos stay on your device.');
        });

        it('formats hint for partial progress', () => {
            const hint = formatPostureHint(1, 3);
            expect(hint).toBe('Nice! 2 more snapshots to reach your goal.');
        });

        it('formats hint for one remaining', () => {
            const hint = formatPostureHint(1, 2);
            expect(hint).toBe('Nice! 1 more snapshot to reach your goal.');
        });

        it('formats hint for goal met', () => {
            const hint = formatPostureHint(2, 2);
            expect(hint).toBe('Posture goal met. Great alignment today!');
        });

        it('formats hint for exceeded goal', () => {
            const hint = formatPostureHint(5, 2);
            expect(hint).toBe('Posture goal met. Great alignment today!');
        });
    });

    describe('formatBowingIntroText', () => {
        it('appends goal to base text', () => {
            const text = formatBowingIntroText('Practice bowing technique.', 3);
            expect(text).toBe('Practice bowing technique. Goal: 3 sets.');
        });

        it('handles empty base text', () => {
            const text = formatBowingIntroText('', 5);
            expect(text).toBe(' Goal: 5 sets.');
        });
    });

    describe('shouldClearTapTimes', () => {
        it('returns true when time gap exceeds threshold', () => {
            expect(shouldClearTapTimes(1000, 3500, 2000)).toBe(true);
        });

        it('returns false when time gap is within threshold', () => {
            expect(shouldClearTapTimes(1000, 2500, 2000)).toBe(false);
        });

        it('returns false when times are equal', () => {
            expect(shouldClearTapTimes(1000, 1000, 2000)).toBe(false);
        });
    });

    describe('isBfcachePagehide', () => {
        it('returns true for persisted pagehide-like events', () => {
            expect(isBfcachePagehide({ persisted: true })).toBe(true);
        });

        it('returns false for non-persisted or missing events', () => {
            expect(isBfcachePagehide({ persisted: false })).toBe(false);
            expect(isBfcachePagehide({})).toBe(false);
            expect(isBfcachePagehide(null)).toBe(false);
            expect(isBfcachePagehide(undefined)).toBe(false);
        });
    });
});
