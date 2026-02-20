import { describe, expect, it } from 'vitest';
import { buildRecommendationSummaryMarkdown } from '../../scripts/render-performance-recommendation-summary.mjs';

describe('render-performance-recommendation-summary', () => {
    it('renders key recommendation and PR gate fields', () => {
        const markdown = buildRecommendationSummaryMarkdown({
            confidence: 'high',
            selection: { selectedRunCount: 12, loadedRunCount: 16 },
            recommendedBudgets: { fcpMs: 2400, lcpMs: 3300 },
            suggestedBudgets: { fcpMs: 2500, lcpMs: 3500 },
            guardrails: { adjusted: true },
            prGateRecommendation: {
                mode: 'consider_blocking',
                reason: 'failure_rate_within_target',
                targetFailureRatePct: 5,
            },
            thresholdHealth: {
                current: { failureRatePct: 4.2, failingRuns: 1, totalRuns: 24 },
                recommended: { failureRatePct: 3.1, failingRuns: 1, totalRuns: 32 },
            },
            notes: ['Collect one more week of runs before threshold lock-in.'],
        });

        expect(markdown).toContain('Performance Budget Recommendation');
        expect(markdown).toContain('Runs used: 12 selected / 16 loaded');
        expect(markdown).toContain('Confidence: high');
        expect(markdown).toContain('FCP <= 2500ms, LCP <= 3500ms');
        expect(markdown).toContain('Raw recommendation before guardrails: FCP <= 2400ms, LCP <= 3300ms');
        expect(markdown).toContain('PR gate recommendation: Consider Blocking');
        expect(markdown).toContain('target failure rate <= 5%');
        expect(markdown).toContain('Current threshold failure rate: 4.2% (1/24)');
        expect(markdown).toContain('Recommended threshold failure rate: 3.1% (1/32)');
        expect(markdown).toContain('PERF_BUDGET_FCP_MS=2500');
        expect(markdown).toContain('PERF_BUDGET_LCP_MS=3500');
    });

    it('handles sparse recommendation payloads gracefully', () => {
        const markdown = buildRecommendationSummaryMarkdown({
            recommendedBudgets: { fcpMs: 2500, lcpMs: 3500 },
        });

        expect(markdown).toContain('Runs used: n/a selected / n/a loaded');
        expect(markdown).toContain('PR gate recommendation: Unknown');
        expect(markdown).toContain('PERF_BUDGET_FCP_MS=2500');
        expect(markdown).toContain('PERF_BUDGET_LCP_MS=3500');
    });
});
