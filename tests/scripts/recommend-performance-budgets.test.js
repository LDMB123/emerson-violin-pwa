import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    applyBudgetGuardrails,
    computeBudgetFailureStats,
    inferCurrentBudgetsFromSummaries,
    loadBudgetSummaries,
    recommendBudgets,
    recommendPrGateMode,
    selectSummariesForRecommendation,
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
        expect(recommendation.confidence).toBe('high');
        expect(recommendation.notes).toEqual([]);
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

    it('marks recommendation confidence low when run count is below threshold', () => {
        const recommendation = recommendBudgets([
            { fcp: 1000, lcp: 1500 },
            { fcp: 1100, lcp: 1600 },
        ], {
            minimumRunsForConfidence: 5,
        });

        expect(recommendation.confidence).toBe('low');
        expect(recommendation.notes[0]).toContain('Collect at least 5 runs');
    });

    it('filters to a recency window and keeps the most recent runs first', () => {
        const { summaries, selection } = selectSummariesForRecommendation([
            { fcp: 1000, lcp: 1500, finishedAt: '2026-02-20T09:00:00.000Z' },
            { fcp: 1100, lcp: 1600, finishedAt: '2026-02-18T09:00:00.000Z' },
            { fcp: 1200, lcp: 1700, finishedAt: '2026-02-01T09:00:00.000Z' },
        ], {
            windowDays: 7,
            nowMs: Date.parse('2026-02-20T12:00:00.000Z'),
        });

        expect(summaries).toHaveLength(2);
        expect(summaries[0].fcp).toBe(1000);
        expect(summaries[1].fcp).toBe(1100);
        expect(selection).toMatchObject({
            loadedRunCount: 3,
            selectedRunCount: 2,
            windowDays: 7,
            droppedOutsideWindow: 1,
            droppedWithoutTimestamp: 0,
        });
    });

    it('drops runs without timestamps when applying recency filtering', () => {
        const { summaries, selection } = selectSummariesForRecommendation([
            { fcp: 1000, lcp: 1500 },
            { fcp: 1100, lcp: 1600, finishedAt: '2026-02-20T09:00:00.000Z' },
        ], {
            windowDays: 7,
            nowMs: Date.parse('2026-02-20T12:00:00.000Z'),
        });

        expect(summaries).toHaveLength(1);
        expect(summaries[0].fcp).toBe(1100);
        expect(selection.droppedWithoutTimestamp).toBe(1);
    });

    it('caps selection to the most recent run count when requested', () => {
        const { summaries, selection } = selectSummariesForRecommendation([
            { fcp: 1000, lcp: 1500, finishedAt: '2026-02-20T09:00:00.000Z' },
            { fcp: 1100, lcp: 1600, finishedAt: '2026-02-19T09:00:00.000Z' },
            { fcp: 1200, lcp: 1700, finishedAt: '2026-02-18T09:00:00.000Z' },
        ], {
            maxRecentRuns: 2,
        });

        expect(summaries).toHaveLength(2);
        expect(summaries[0].fcp).toBe(1000);
        expect(summaries[1].fcp).toBe(1100);
        expect(selection.maxRecentRuns).toBe(2);
    });

    it('infers current budgets from summary metadata when available', () => {
        const inferred = inferCurrentBudgetsFromSummaries([
            { fcp: 1000, lcp: 1500 },
            { fcp: 1100, lcp: 1600, budgets: { fcpMs: 2500, lcpMs: 3500 } },
        ]);

        expect(inferred).toEqual({ fcpMs: 2500, lcpMs: 3500 });
    });

    it('ignores unrealistically tiny inferred budgets from synthetic summaries', () => {
        const inferred = inferCurrentBudgetsFromSummaries([
            { fcp: 80, lcp: 90, budgets: { fcpMs: 1, lcpMs: 1 } },
        ]);

        expect(inferred).toBeNull();
    });

    it('computes pass/fail rates for a budget threshold', () => {
        const stats = computeBudgetFailureStats([
            { fcp: 1200, lcp: 2000 },
            { fcp: 2600, lcp: 2100 },
            { fcp: 1100, lcp: 3600 },
            { fcp: 1300, lcp: 2200 },
        ], {
            fcpMs: 2500,
            lcpMs: 3500,
        });

        expect(stats).toMatchObject({
            totalRuns: 4,
            passingRuns: 2,
            failingRuns: 2,
            failureRatePct: 50,
            passRatePct: 50,
        });
    });

    it('applies tighten/loosen guardrails to raw recommendations', () => {
        const { suggestedBudgets, guardrails } = applyBudgetGuardrails({
            fcpMs: 1800,
            lcpMs: 5000,
        }, {
            fcpMs: 2500,
            lcpMs: 3500,
        }, {
            maxTightenPct: 10,
            maxLoosenPct: 20,
            roundMs: 25,
        });

        expect(suggestedBudgets).toEqual({
            fcpMs: 2250,
            lcpMs: 4200,
        });
        expect(guardrails).toMatchObject({
            enabled: true,
            adjusted: true,
            maxTightenPct: 10,
            maxLoosenPct: 20,
        });
        expect(guardrails.fcp).toMatchObject({
            raw: 1800,
            lowerBound: 2250,
            upperBound: 3000,
            suggested: 2250,
            adjusted: true,
        });
        expect(guardrails.lcp).toMatchObject({
            raw: 5000,
            lowerBound: 3150,
            upperBound: 4200,
            suggested: 4200,
            adjusted: true,
        });
    });

    it('disables guardrails when current budgets are missing', () => {
        const { suggestedBudgets, guardrails } = applyBudgetGuardrails({
            fcpMs: 2300,
            lcpMs: 3200,
        }, null, {
            maxTightenPct: 10,
            maxLoosenPct: 20,
            roundMs: 25,
        });

        expect(suggestedBudgets).toEqual({
            fcpMs: 2300,
            lcpMs: 3200,
        });
        expect(guardrails).toMatchObject({
            enabled: false,
            reason: 'missing_current_budgets',
            maxTightenPct: 10,
            maxLoosenPct: 20,
        });
    });

    it('recommends report-only when confidence is low', () => {
        const prRecommendation = recommendPrGateMode({
            confidence: 'low',
        }, {
            targetFailureRatePct: 5,
        });

        expect(prRecommendation).toMatchObject({
            mode: 'report_only',
            reason: 'low_confidence',
            targetFailureRatePct: 5,
        });
    });

    it('recommends report-only when threshold health is missing', () => {
        const prRecommendation = recommendPrGateMode({
            confidence: 'high',
        }, {
            targetFailureRatePct: 5,
        });

        expect(prRecommendation).toMatchObject({
            mode: 'report_only',
            reason: 'missing_threshold_health',
            targetFailureRatePct: 5,
        });
    });

    it('recommends consider-blocking when both failure rates are within target', () => {
        const prRecommendation = recommendPrGateMode({
            confidence: 'high',
            thresholdHealth: {
                current: { failureRatePct: 2.5 },
                recommended: { failureRatePct: 1.1 },
            },
        }, {
            targetFailureRatePct: 5,
        });

        expect(prRecommendation).toMatchObject({
            mode: 'consider_blocking',
            reason: 'failure_rate_within_target',
            targetFailureRatePct: 5,
            currentFailureRatePct: 2.5,
            recommendedFailureRatePct: 1.1,
        });
    });

    it('recommends report-only when either failure rate exceeds target', () => {
        const prRecommendation = recommendPrGateMode({
            confidence: 'high',
            thresholdHealth: {
                current: { failureRatePct: 8.5 },
                recommended: { failureRatePct: 3.2 },
            },
        }, {
            targetFailureRatePct: 5,
        });

        expect(prRecommendation).toMatchObject({
            mode: 'report_only',
            reason: 'failure_rate_above_target',
            targetFailureRatePct: 5,
            currentFailureRatePct: 8.5,
            recommendedFailureRatePct: 3.2,
        });
    });
});
