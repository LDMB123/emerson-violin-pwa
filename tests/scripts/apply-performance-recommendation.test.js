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
        })).toThrow('Expected exactly one PERF_BUDGET_FCP_MS / PERF_BUDGET_LCP_MS entry');
    });

    it('also syncs PERF_BUDGET_CURRENT_* keys when present', () => {
        const workflow = `
      - name: Performance budget audit (LCP/FCP)
        env:
          PERF_BUDGET_FCP_MS: '2500'
          PERF_BUDGET_LCP_MS: '3500'
      - name: Recommend performance budgets (informational)
        env:
          PERF_BUDGET_CURRENT_FCP_MS: '2500'
          PERF_BUDGET_CURRENT_LCP_MS: '3500'
`;

        const updated = applyBudgetsToWorkflow(workflow, {
            fcpMs: 2300,
            lcpMs: 3300,
        });

        expect(updated).toContain("PERF_BUDGET_FCP_MS: '2300'");
        expect(updated).toContain("PERF_BUDGET_LCP_MS: '3300'");
        expect(updated).toContain("PERF_BUDGET_CURRENT_FCP_MS: '2300'");
        expect(updated).toContain("PERF_BUDGET_CURRENT_LCP_MS: '3300'");
    });

    it('throws when only one PERF_BUDGET_CURRENT_* key is present', () => {
        const workflow = `
      - name: Performance budget audit (LCP/FCP)
        env:
          PERF_BUDGET_FCP_MS: '2500'
          PERF_BUDGET_LCP_MS: '3500'
      - name: Recommend performance budgets (informational)
        env:
          PERF_BUDGET_CURRENT_FCP_MS: '2500'
`;

        expect(() => applyBudgetsToWorkflow(workflow, {
            fcpMs: 2300,
            lcpMs: 3300,
        })).toThrow('Found only one PERF_BUDGET_CURRENT_* key');
    });

    it('throws when PERF_BUDGET_FCP_MS/PERF_BUDGET_LCP_MS keys are duplicated', () => {
        const workflow = `
      - name: Performance budget audit (LCP/FCP)
        env:
          PERF_BUDGET_FCP_MS: '2500'
          PERF_BUDGET_FCP_MS: '2600'
          PERF_BUDGET_LCP_MS: '3500'
`;

        expect(() => applyBudgetsToWorkflow(workflow, {
            fcpMs: 2300,
            lcpMs: 3300,
        })).toThrow('Expected exactly one PERF_BUDGET_FCP_MS / PERF_BUDGET_LCP_MS entry');
    });

    it('throws when PERF_BUDGET_CURRENT_* keys are duplicated', () => {
        const workflow = `
      - name: Performance budget audit (LCP/FCP)
        env:
          PERF_BUDGET_FCP_MS: '2500'
          PERF_BUDGET_LCP_MS: '3500'
      - name: Recommend performance budgets (informational)
        env:
          PERF_BUDGET_CURRENT_FCP_MS: '2500'
          PERF_BUDGET_CURRENT_FCP_MS: '2400'
          PERF_BUDGET_CURRENT_LCP_MS: '3500'
          PERF_BUDGET_CURRENT_LCP_MS: '3400'
`;

        expect(() => applyBudgetsToWorkflow(workflow, {
            fcpMs: 2300,
            lcpMs: 3300,
        })).toThrow('Expected at most one PERF_BUDGET_CURRENT_* entry pair');
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
