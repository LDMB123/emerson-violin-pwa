import { describe, expect, it } from 'vitest';
import {
    applyBudgetsToWorkflow,
    assertRecommendationIsApplySafe,
    selectBudgetsForApply,
} from '../../scripts/apply-performance-recommendation.mjs';

describe('apply-performance-recommendation', () => {
    it('replaces FCP and LCP workflow env values', () => {
        const workflow = `
      - name: Performance budget audit (LCP/FCP)
        env:
          PERF_BUDGET_FCP_MS: '2500'
          PERF_BUDGET_LCP_MS: '3500'
          PERF_BUDGET_REPORT_ONLY: 'true'
`;

        const updated = applyBudgetsToWorkflow(workflow, {
            fcpMs: 2200,
            lcpMs: 3200,
        });

        expect(updated).toContain("PERF_BUDGET_FCP_MS: '2200'");
        expect(updated).toContain("PERF_BUDGET_LCP_MS: '3200'");
        expect(updated).toContain("PERF_BUDGET_REPORT_ONLY: 'true'");
    });

    it('throws when expected budget env keys are missing', () => {
        expect(() => applyBudgetsToWorkflow('name: quality\n', {
            fcpMs: 2200,
            lcpMs: 3200,
        })).toThrow('Failed to locate PERF_BUDGET_FCP_MS / PERF_BUDGET_LCP_MS');
    });

    it('blocks low-confidence recommendation apply by default', () => {
        expect(() => assertRecommendationIsApplySafe({
            confidence: 'low',
            selection: { selectedRunCount: 2 },
        })).toThrow('Refusing to apply automatically');
    });

    it('allows low-confidence recommendation apply when override is enabled', () => {
        expect(() => assertRecommendationIsApplySafe({
            confidence: 'low',
            selection: { selectedRunCount: 2 },
        }, {
            allowLowConfidence: true,
        })).not.toThrow();
    });

    it('prefers suggested budgets when available', () => {
        expect(selectBudgetsForApply({
            recommendedBudgets: { fcpMs: 2400, lcpMs: 3400 },
            suggestedBudgets: { fcpMs: 2500, lcpMs: 3500 },
        })).toEqual({
            source: 'suggestedBudgets',
            fcpMs: 2500,
            lcpMs: 3500,
        });
    });

    it('falls back to recommended budgets when suggested budgets are missing', () => {
        expect(selectBudgetsForApply({
            recommendedBudgets: { fcpMs: 2400, lcpMs: 3400 },
        })).toEqual({
            source: 'recommendedBudgets',
            fcpMs: 2400,
            lcpMs: 3400,
        });
    });
});
