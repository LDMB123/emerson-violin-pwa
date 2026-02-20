import { describe, expect, it } from 'vitest';
import { applyBudgetsToWorkflow } from '../../scripts/apply-performance-recommendation.mjs';

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
});
