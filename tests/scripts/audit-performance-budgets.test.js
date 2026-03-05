import { describe, expect, it } from 'vitest';
import {
    getBudgetFailures,
    getLcpFallbackNote,
    LCP_FALLBACK_NOTE,
    parseBooleanEnv,
} from '../../scripts/audit-performance-budgets.mjs';

describe('audit-performance-budgets helpers', () => {
    it('parses boolean env values with fallback handling', () => {
        expect(parseBooleanEnv('true', false)).toBe(true);
        expect(parseBooleanEnv('1', false)).toBe(true);
        expect(parseBooleanEnv('false', true)).toBe(false);
        expect(parseBooleanEnv('0', true)).toBe(false);
        expect(parseBooleanEnv(undefined, true)).toBe(true);
        expect(parseBooleanEnv('unexpected', false)).toBe(false);
    });

    it('builds budget failure messages for exceeded medians', () => {
        const failures = getBudgetFailures({
            fcpMedian: 2600,
            lcpMedian: 3600,
            fcpBudgetMs: 2500,
            lcpBudgetMs: 3500,
        });

        expect(failures).toHaveLength(2);
        expect(failures[0]).toContain('Median FCP');
        expect(failures[1]).toContain('Median LCP');
    });

    it('returns no failures when medians are within budget', () => {
        const failures = getBudgetFailures({
            fcpMedian: 1000,
            lcpMedian: 2000,
            fcpBudgetMs: 2500,
            lcpBudgetMs: 3500,
        });

        expect(failures).toEqual([]);
    });

    it('returns fallback note when any sample lacks lcp-entry source', () => {
        const note = getLcpFallbackNote([
            { lcpSource: 'lcp-entry' },
            { lcpSource: 'fmp-fallback' },
        ]);
        expect(note).toBe(LCP_FALLBACK_NOTE);
    });

    it('does not return fallback note when all samples use lcp-entry', () => {
        const note = getLcpFallbackNote([
            { lcpSource: 'lcp-entry' },
            { lcpSource: 'lcp-entry' },
        ]);
        expect(note).toBeNull();
    });
});
