import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const formatMs = (value) => `${Math.round(value * 10) / 10}ms`;

const roundUp = (value, step) => Math.ceil(value / step) * step;

const percentileNearestRank = (values, percentile) => {
    if (!Array.isArray(values) || values.length === 0) return null;
    if (!Number.isFinite(percentile)) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const clamped = Math.min(1, Math.max(0, percentile));
    const index = Math.ceil(clamped * sorted.length) - 1;
    return sorted[Math.max(0, index)];
};

const isSummaryFile = (filePath) => path.extname(filePath).toLowerCase() === '.json';

const walkJsonFiles = (targetPath) => {
    const resolved = path.resolve(targetPath);
    if (!fs.existsSync(resolved)) return [];

    const stat = fs.statSync(resolved);
    if (stat.isFile()) {
        return isSummaryFile(resolved) ? [resolved] : [];
    }
    if (!stat.isDirectory()) return [];

    const files = [];
    const queue = [resolved];
    while (queue.length) {
        const current = queue.shift();
        const entries = fs.readdirSync(current, { withFileTypes: true });
        entries.forEach((entry) => {
            const next = path.join(current, entry.name);
            if (entry.isDirectory()) {
                queue.push(next);
                return;
            }
            if (entry.isFile() && isSummaryFile(next)) {
                files.push(next);
            }
        });
    }
    return files;
};

export const loadBudgetSummaries = (inputs) => {
    const paths = (Array.isArray(inputs) && inputs.length ? inputs : ['artifacts/perf-budget-summary.json'])
        .flatMap((input) => walkJsonFiles(input));
    const uniquePaths = Array.from(new Set(paths));

    return uniquePaths.flatMap((filePath) => {
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw);
            const fcp = parsed?.medians?.fcp;
            const lcp = parsed?.medians?.lcp;
            if (!Number.isFinite(fcp) || !Number.isFinite(lcp)) return [];
            return [{
                filePath,
                fcp,
                lcp,
                budgets: parsed?.budgets ?? null,
                startedAt: parsed?.startedAt ?? null,
                finishedAt: parsed?.finishedAt ?? null,
            }];
        } catch {
            return [];
        }
    });
};

export const recommendBudgets = (
    summaries,
    {
        headroomPct = 15,
        roundMs = 25,
        percentile = 0.95,
    } = {},
) => {
    const validSummaries = Array.isArray(summaries) ? summaries : [];
    const fcpValues = validSummaries.map((entry) => entry.fcp).filter((value) => Number.isFinite(value));
    const lcpValues = validSummaries.map((entry) => entry.lcp).filter((value) => Number.isFinite(value));

    if (fcpValues.length === 0 || lcpValues.length === 0) {
        throw new Error('No valid performance summaries with median FCP/LCP metrics were found.');
    }

    const fcpP95 = percentileNearestRank(fcpValues, percentile);
    const lcpP95 = percentileNearestRank(lcpValues, percentile);
    const headroomMultiplier = 1 + (headroomPct / 100);

    const recommendedFcpMs = roundUp(fcpP95 * headroomMultiplier, roundMs);
    const recommendedLcpMs = roundUp(lcpP95 * headroomMultiplier, roundMs);

    return {
        inputRunCount: validSummaries.length,
        settings: {
            headroomPct,
            roundMs,
            percentile,
        },
        observed: {
            fcp: {
                min: Math.min(...fcpValues),
                p50: percentileNearestRank(fcpValues, 0.5),
                p75: percentileNearestRank(fcpValues, 0.75),
                p95: fcpP95,
                max: Math.max(...fcpValues),
            },
            lcp: {
                min: Math.min(...lcpValues),
                p50: percentileNearestRank(lcpValues, 0.5),
                p75: percentileNearestRank(lcpValues, 0.75),
                p95: lcpP95,
                max: Math.max(...lcpValues),
            },
        },
        recommendedBudgets: {
            fcpMs: recommendedFcpMs,
            lcpMs: recommendedLcpMs,
        },
    };
};

const writeRecommendation = (recommendation, outputPath) => {
    const resolvedOutputPath = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
    fs.writeFileSync(resolvedOutputPath, JSON.stringify(recommendation, null, 2));
    return resolvedOutputPath;
};

const run = () => {
    const outputPath = process.env.PERF_BUDGET_RECOMMENDATION_OUTPUT || 'artifacts/perf-budget-recommendation.json';
    const headroomPct = Number.parseFloat(process.env.PERF_BUDGET_RECOMMENDATION_HEADROOM_PCT || '15');
    const roundMs = Number.parseInt(process.env.PERF_BUDGET_RECOMMENDATION_ROUND_MS || '25', 10);
    const inputs = process.argv.slice(2);

    const summaries = loadBudgetSummaries(inputs);
    const recommendation = recommendBudgets(summaries, { headroomPct, roundMs });
    const resolvedOutputPath = writeRecommendation(recommendation, outputPath);

    console.log(`Loaded ${recommendation.inputRunCount} performance summary file(s).`);
    console.log(`Observed FCP p95: ${formatMs(recommendation.observed.fcp.p95)}`);
    console.log(`Observed LCP p95: ${formatMs(recommendation.observed.lcp.p95)}`);
    console.log(`Recommended budgets: FCP <= ${recommendation.recommendedBudgets.fcpMs}ms, LCP <= ${recommendation.recommendedBudgets.lcpMs}ms`);
    console.log(`Suggested CI env:\nPERF_BUDGET_FCP_MS=${recommendation.recommendedBudgets.fcpMs}\nPERF_BUDGET_LCP_MS=${recommendation.recommendedBudgets.lcpMs}`);
    console.log(`Recommendation written to ${resolvedOutputPath}`);
};

const isDirectExecution = path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);

if (isDirectExecution) {
    try {
        run();
    } catch (error) {
        console.error(`Failed to recommend performance budgets: ${error.message}`);
        process.exit(1);
    }
}
