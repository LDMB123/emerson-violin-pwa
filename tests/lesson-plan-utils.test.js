import { describe, it, expect } from 'vitest';
import {
    toLessonLink,
    computeStepDuration,
    computeStepProgress,
    computeOverallProgress,
    formatStepLabel,
    formatStepCue,
    shouldResetLesson,
    getNextStepIndex,
    canAdvanceStep,
} from '../src/utils/lesson-plan-utils.js';

describe('lesson-plan-utils', () => {
    describe('toLessonLink', () => {
        it('returns #view-games for null', () => {
            expect(toLessonLink(null)).toBe('#view-games');
        });

        it('returns #view-games for undefined', () => {
            expect(toLessonLink(undefined)).toBe('#view-games');
        });

        it('returns #view-games for empty string', () => {
            expect(toLessonLink('')).toBe('#view-games');
        });

        it('returns hash-prefixed string for view- IDs', () => {
            expect(toLessonLink('view-pitch-quest')).toBe('#view-pitch-quest');
        });

        it('adds #view-game- prefix for game IDs', () => {
            expect(toLessonLink('pitch-quest')).toBe('#view-game-pitch-quest');
        });

        it('handles already-prefixed view IDs', () => {
            expect(toLessonLink('view-games')).toBe('#view-games');
        });
    });

    describe('computeStepDuration', () => {
        it('converts minutes to seconds', () => {
            expect(computeStepDuration(2)).toBe(120);
        });

        it('enforces 30 second minimum', () => {
            expect(computeStepDuration(0.4)).toBe(30);
            expect(computeStepDuration(0.1)).toBe(30);
        });

        it('rounds to nearest second', () => {
            expect(computeStepDuration(1.5)).toBe(90);
            expect(computeStepDuration(2.7)).toBe(162);
        });

        it('defaults to 1 minute for null/undefined', () => {
            expect(computeStepDuration(null)).toBe(60);
            expect(computeStepDuration(undefined)).toBe(60);
        });

        it('handles large durations', () => {
            expect(computeStepDuration(10)).toBe(600);
        });
    });

    describe('computeStepProgress', () => {
        it('returns 0 when not active', () => {
            expect(computeStepProgress(120, 60, false)).toBe(0);
        });

        it('returns 0 at start', () => {
            expect(computeStepProgress(120, 120, true)).toBe(0);
        });

        it('returns 0.5 at midpoint', () => {
            expect(computeStepProgress(120, 60, true)).toBe(0.5);
        });

        it('returns 1 when complete', () => {
            expect(computeStepProgress(120, 0, true)).toBe(1);
        });

        it('clamps to maximum of 1', () => {
            expect(computeStepProgress(120, -10, true)).toBe(1);
        });

        it('clamps to minimum of 0', () => {
            expect(computeStepProgress(120, 150, true)).toBe(0);
        });

        it('handles fractional progress', () => {
            const progress = computeStepProgress(100, 25, true);
            expect(progress).toBeCloseTo(0.75, 5);
        });
    });

    describe('computeOverallProgress', () => {
        it('returns 0 for 0 total steps', () => {
            expect(computeOverallProgress(0, 0, 0)).toBe(0);
        });

        it('returns 0 at start', () => {
            expect(computeOverallProgress(0, 0, 5)).toBe(0);
        });

        it('includes partial step progress', () => {
            expect(computeOverallProgress(2, 0.5, 5)).toBe(0.5);
        });

        it('returns 1 when all steps complete', () => {
            expect(computeOverallProgress(5, 0, 5)).toBe(1);
        });

        it('clamps to maximum of 1', () => {
            expect(computeOverallProgress(10, 0.5, 5)).toBe(1);
        });

        it('handles single step lessons', () => {
            expect(computeOverallProgress(0, 0.7, 1)).toBe(0.7);
        });
    });

    describe('formatStepLabel', () => {
        it('returns default message for 0 steps', () => {
            expect(formatStepLabel(0, 0)).toBe('No lesson plan yet');
        });

        it('formats step 1 of 5', () => {
            expect(formatStepLabel(0, 5)).toBe('Step 1 of 5');
        });

        it('formats step 3 of 5', () => {
            expect(formatStepLabel(2, 5)).toBe('Step 3 of 5');
        });

        it('formats last step', () => {
            expect(formatStepLabel(4, 5)).toBe('Step 5 of 5');
        });

        it('clamps index to total steps', () => {
            expect(formatStepLabel(10, 5)).toBe('Step 5 of 5');
        });

        it('handles single step lesson', () => {
            expect(formatStepLabel(0, 1)).toBe('Step 1 of 1');
        });
    });

    describe('formatStepCue', () => {
        it('returns default message for null step', () => {
            expect(formatStepCue(null)).toBe('Tap Start to begin.');
        });

        it('returns default message for step without label', () => {
            expect(formatStepCue({})).toBe('Tap Start to begin.');
        });

        it('returns label only when no cue', () => {
            const step = { label: 'Practice scales' };
            expect(formatStepCue(step)).toBe('Practice scales');
        });

        it('concatenates label and cue with separator', () => {
            const step = { label: 'Practice scales', cue: 'Focus on intonation' };
            expect(formatStepCue(step)).toBe('Practice scales · Focus on intonation');
        });

        it('ignores empty cue', () => {
            const step = { label: 'Practice scales', cue: '' };
            expect(formatStepCue(step)).toBe('Practice scales');
        });
    });

    describe('shouldResetLesson', () => {
        it('returns false when steps remain', () => {
            expect(shouldResetLesson(2, 5)).toBe(false);
        });

        it('returns true when all steps complete', () => {
            expect(shouldResetLesson(5, 5)).toBe(true);
        });

        it('returns true when completed exceeds total', () => {
            expect(shouldResetLesson(10, 5)).toBe(true);
        });

        it('returns false at start', () => {
            expect(shouldResetLesson(0, 5)).toBe(false);
        });
    });

    describe('getNextStepIndex', () => {
        it('returns 0 when lesson complete', () => {
            expect(getNextStepIndex(4, 5, 5)).toBe(0);
        });

        it('returns completed count for next step', () => {
            expect(getNextStepIndex(1, 2, 5)).toBe(2);
        });

        it('returns 0 at start', () => {
            expect(getNextStepIndex(0, 0, 5)).toBe(0);
        });

        it('resets to 0 when completed exceeds total', () => {
            expect(getNextStepIndex(3, 10, 5)).toBe(0);
        });
    });

    describe('canAdvanceStep', () => {
        it('returns true when steps remain', () => {
            expect(canAdvanceStep(2, 5)).toBe(true);
        });

        it('returns false when all steps complete', () => {
            expect(canAdvanceStep(5, 5)).toBe(false);
        });

        it('returns false when completed exceeds total', () => {
            expect(canAdvanceStep(10, 5)).toBe(false);
        });

        it('returns true at start', () => {
            expect(canAdvanceStep(0, 5)).toBe(true);
        });
    });
});
