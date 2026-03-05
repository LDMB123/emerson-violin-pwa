import { describe, expect, it } from 'vitest';
import {
    mergeDayHighScore,
    buildDueReviewEntry,
    selectDueReviewEntries,
} from '../src/utils/mastery-utils.js';

describe('mastery-utils', () => {
    it('adds day score when day key is missing', () => {
        const days = mergeDayHighScore({}, '123', 88);
        expect(days).toEqual({ 123: 88 });
    });

    it('keeps the higher existing score for a day', () => {
        const days = mergeDayHighScore({ 123: 91 }, '123', 82);
        expect(days).toEqual({ 123: 91 });
    });

    it('updates day score when new score is higher', () => {
        const days = mergeDayHighScore({ 123: 79 }, 123, 95);
        expect(days).toEqual({ 123: 95 });
    });

    it('builds a due-review entry with computed overdue and defaults', () => {
        const entry = buildDueReviewEntry({
            id: 'song-a',
            dueAt: 75,
            now: 100,
        });
        expect(entry).toEqual({
            id: 'song-a',
            dueAt: 75,
            overdueMs: 25,
            tier: 'foundation',
            attempts: 0,
        });
    });

    it('selects, sorts, and limits due-review entries', () => {
        const now = 100;
        const entries = [
            buildDueReviewEntry({ id: 'soon', dueAt: 95, now }),
            buildDueReviewEntry({ id: 'most-overdue', dueAt: 10, now }),
            buildDueReviewEntry({ id: 'future', dueAt: 120, now }),
        ];
        const due = selectDueReviewEntries(entries, { now, limit: 2 });
        expect(due.map((entry) => entry.id)).toEqual(['most-overdue', 'soon']);
    });

    it('can require positive dueAt values for due-review selection', () => {
        const now = 100;
        const entries = [
            buildDueReviewEntry({ id: 'zero', dueAt: 0, now }),
            buildDueReviewEntry({ id: 'late', dueAt: 20, now }),
        ];
        const due = selectDueReviewEntries(entries, {
            now,
            limit: 5,
            requirePositiveDueAt: true,
        });
        expect(due.map((entry) => entry.id)).toEqual(['late']);
    });
});
