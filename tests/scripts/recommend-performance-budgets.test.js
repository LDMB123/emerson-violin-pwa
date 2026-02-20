import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    loadBudgetSummaries,
    recommendBudgets,
} from '../../scripts/recommend-performance-budgets.mjs';

describe('recommend-performance-budgets', () => {
    it('computes p95-based recommendations with configured headroom', () => {
        const recommendation = recommendBudgets([
            { fcp: 1000, lcp: 1500 },
            { fcp: 1200, lcp: 1900 },
            { fcp: 1400, lcp: 2200 },
            { fcp: 1600, lcp: 2400 },
            { fcp: 1800, lcp: 2600 },
        ], {
            headroomPct: 15,
            roundMs: 25,
        });

        expect(recommendation.observed.fcp.p95).toBe(1800);
        expect(recommendation.observed.lcp.p95).toBe(2600);
        expect(recommendation.recommendedBudgets.fcpMs).toBe(2075);
        expect(recommendation.recommendedBudgets.lcpMs).toBe(3000);
    });

    it('loads summaries recursively and ignores invalid files', () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-budget-summaries-'));
        const nestedDir = path.join(tempRoot, 'nested');
        fs.mkdirSync(nestedDir, { recursive: true });

        const validSummaryPath = path.join(tempRoot, 'perf-budget-summary.json');
        const validNestedSummaryPath = path.join(nestedDir, 'run-2.json');
        const invalidSummaryPath = path.join(tempRoot, 'invalid.json');

        fs.writeFileSync(validSummaryPath, JSON.stringify({
            medians: { fcp: 1200, lcp: 2400 },
            budgets: { fcpMs: 2500, lcpMs: 3500 },
        }));
        fs.writeFileSync(validNestedSummaryPath, JSON.stringify({
            medians: { fcp: 1300, lcp: 2500 },
        }));
        fs.writeFileSync(invalidSummaryPath, JSON.stringify({ medians: { fcp: 'bad', lcp: null } }));

        const summaries = loadBudgetSummaries([tempRoot]);

        expect(summaries).toHaveLength(2);
        expect(summaries.map((entry) => entry.filePath).sort()).toEqual([
            validNestedSummaryPath,
            validSummaryPath,
        ].sort());
    });
});
