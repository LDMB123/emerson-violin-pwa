import { describe, expect, it } from 'vitest';
import {
    readPerformanceBudgetConfig,
    validatePerformanceBudgetConfig,
} from '../../scripts/audit-performance-budget-config.mjs';

describe('audit-performance-budget-config', () => {
    it('parses threshold and recommendation config values from workflow source', () => {
        const workflow = `
      - name: Performance budget audit (LCP/FCP)
        env:
          PERF_BUDGET_FCP_MS: '2500'
          PERF_BUDGET_LCP_MS: '3500'
      - name: Recommend performance budgets (informational)
        env:
          PERF_BUDGET_CURRENT_FCP_MS: '2500'
          PERF_BUDGET_CURRENT_LCP_MS: '3500'
          PERF_BUDGET_RECOMMENDATION_PR_TARGET_FAILURE_PCT: '5'
          PERF_BUDGET_RECOMMENDATION_MAX_TIGHTEN_PCT: '10'
          PERF_BUDGET_RECOMMENDATION_MAX_LOOSEN_PCT: '20'
`;

        expect(readPerformanceBudgetConfig(workflow)).toEqual({
            thresholds: { fcpMs: 2500, lcpMs: 3500 },
            currentThresholds: { fcpMs: 2500, lcpMs: 3500 },
            recommendation: {
                prTargetFailurePct: 5,
                maxTightenPct: 10,
                maxLoosenPct: 20,
            },
        });
    });

    it('returns no issues when config is synced and valid', () => {
        const issues = validatePerformanceBudgetConfig({
            thresholds: { fcpMs: 2500, lcpMs: 3500 },
            currentThresholds: { fcpMs: 2500, lcpMs: 3500 },
            recommendation: {
                prTargetFailurePct: 5,
                maxTightenPct: 10,
                maxLoosenPct: 20,
            },
        });

        expect(issues).toEqual([]);
    });

    it('reports drift and invalid recommendation bounds', () => {
        const issues = validatePerformanceBudgetConfig({
            thresholds: { fcpMs: 2400, lcpMs: 3400 },
            currentThresholds: { fcpMs: 2500, lcpMs: 3300 },
            recommendation: {
                prTargetFailurePct: 120,
                maxTightenPct: -1,
                maxLoosenPct: 150,
            },
        });

        expect(issues).toContain('FCP threshold drift: PERF_BUDGET_FCP_MS=2400 but PERF_BUDGET_CURRENT_FCP_MS=2500.');
        expect(issues).toContain('LCP threshold drift: PERF_BUDGET_LCP_MS=3400 but PERF_BUDGET_CURRENT_LCP_MS=3300.');
        expect(issues).toContain('PERF_BUDGET_RECOMMENDATION_PR_TARGET_FAILURE_PCT must be > 0 and <= 100.');
        expect(issues).toContain('PERF_BUDGET_RECOMMENDATION_MAX_TIGHTEN_PCT must be > 0 and <= 100.');
        expect(issues).toContain('PERF_BUDGET_RECOMMENDATION_MAX_LOOSEN_PCT must be > 0 and <= 100.');
    });
});
