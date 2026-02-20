import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const formatMs = (value) => `${Math.round(value * 10) / 10}ms`;

const roundUp = (value, step) => Math.ceil(value / step) * step;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_REASONABLE_BUDGET_MS = 100;

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

const parseSummaryTimestampMs = (entry) => {
    const candidates = [entry?.finishedAt, entry?.startedAt];
    for (const candidate of candidates) {
        const timestampMs = Date.parse(candidate);
        if (Number.isFinite(timestampMs)) {
            return timestampMs;
        }
    }
    return null;
};

const parsePositiveInteger = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const roundPct = (value) => Math.round(value * 10) / 10;

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

export const selectSummariesForRecommendation = (
    summaries,
    {
        windowDays = null,
        maxRecentRuns = null,
        nowMs = Date.now(),
    } = {},
) => {
    const source = Array.isArray(summaries) ? summaries : [];
    const hasWindowFilter = Number.isFinite(windowDays) && windowDays > 0;
    const hasMaxRunsFilter = Number.isFinite(maxRecentRuns) && maxRecentRuns > 0;
    const cutoffMs = hasWindowFilter ? nowMs - (windowDays * MS_PER_DAY) : null;

    let droppedWithoutTimestamp = 0;
    let droppedOutsideWindow = 0;

    const timestamped = source.map((entry) => ({
        ...entry,
        __timestampMs: parseSummaryTimestampMs(entry),
    }));

    let filtered = timestamped.filter((entry) => {
        if (!hasWindowFilter) {
            return true;
        }
        if (!Number.isFinite(entry.__timestampMs)) {
            droppedWithoutTimestamp += 1;
            return false;
        }
        if (entry.__timestampMs < cutoffMs) {
            droppedOutsideWindow += 1;
            return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        const aMs = Number.isFinite(a.__timestampMs) ? a.__timestampMs : Number.NEGATIVE_INFINITY;
        const bMs = Number.isFinite(b.__timestampMs) ? b.__timestampMs : Number.NEGATIVE_INFINITY;
        return bMs - aMs;
    });

    if (hasMaxRunsFilter) {
        filtered = filtered.slice(0, maxRecentRuns);
    }

    return {
        summaries: filtered.map(({ __timestampMs, ...entry }) => entry),
        selection: {
            loadedRunCount: source.length,
            selectedRunCount: filtered.length,
            windowDays: hasWindowFilter ? windowDays : null,
            maxRecentRuns: hasMaxRunsFilter ? maxRecentRuns : null,
            droppedWithoutTimestamp,
            droppedOutsideWindow,
        },
    };
};

export const inferCurrentBudgetsFromSummaries = (summaries) => {
    const source = Array.isArray(summaries) ? summaries : [];
    const validBudgets = source
        .map((entry) => entry?.budgets)
        .filter((budgets) =>
            Number.isFinite(budgets?.fcpMs) &&
            Number.isFinite(budgets?.lcpMs) &&
            budgets.fcpMs >= MIN_REASONABLE_BUDGET_MS &&
            budgets.lcpMs >= MIN_REASONABLE_BUDGET_MS
        );

    if (validBudgets.length === 0) return null;

    const counts = new Map();
    validBudgets.forEach((budgets) => {
        const key = `${budgets.fcpMs}:${budgets.lcpMs}`;
        counts.set(key, (counts.get(key) || 0) + 1);
    });

    const [bestKey] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const [fcpMs, lcpMs] = bestKey.split(':').map((value) => Number.parseInt(value, 10));
    return { fcpMs, lcpMs };
};

export const computeBudgetFailureStats = (summaries, budgets) => {
    const source = Array.isArray(summaries) ? summaries : [];
    if (!Number.isFinite(budgets?.fcpMs) || !Number.isFinite(budgets?.lcpMs)) {
        return null;
    }

    const failingRuns = source.filter((entry) => (
        entry.fcp > budgets.fcpMs || entry.lcp > budgets.lcpMs
    )).length;
    const totalRuns = source.length;
    const passingRuns = Math.max(0, totalRuns - failingRuns);
    const failureRatePct = totalRuns > 0 ? roundPct((failingRuns / totalRuns) * 100) : 0;
    const passRatePct = totalRuns > 0 ? roundPct((passingRuns / totalRuns) * 100) : 0;

    return {
        totalRuns,
        passingRuns,
        failingRuns,
        failureRatePct,
        passRatePct,
    };
};

export const recommendBudgets = (
    summaries,
    {
        headroomPct = 15,
        roundMs = 25,
        percentile = 0.95,
        minimumRunsForConfidence = 5,
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
    const confidence = validSummaries.length >= minimumRunsForConfidence ? 'high' : 'low';
    const notes = [];
    if (confidence === 'low') {
        notes.push(
            `Only ${validSummaries.length} run(s) were found. Collect at least ${minimumRunsForConfidence} runs before treating recommendations as stable.`,
        );
    }

    return {
        inputRunCount: validSummaries.length,
        confidence,
        notes,
        settings: {
            headroomPct,
            roundMs,
            percentile,
            minimumRunsForConfidence,
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
    const minimumRunsForConfidence = Number.parseInt(
        process.env.PERF_BUDGET_RECOMMENDATION_MIN_RUNS || '5',
        10,
    );
    const currentFcpBudget = parsePositiveInteger(process.env.PERF_BUDGET_CURRENT_FCP_MS);
    const currentLcpBudget = parsePositiveInteger(process.env.PERF_BUDGET_CURRENT_LCP_MS);
    const windowDays = parsePositiveInteger(process.env.PERF_BUDGET_RECOMMENDATION_WINDOW_DAYS);
    const maxRecentRuns = parsePositiveInteger(process.env.PERF_BUDGET_RECOMMENDATION_MAX_RUNS);
    const inputs = process.argv.slice(2);

    const loadedSummaries = loadBudgetSummaries(inputs);
    const { summaries, selection } = selectSummariesForRecommendation(loadedSummaries, {
        windowDays,
        maxRecentRuns,
    });
    const recommendation = recommendBudgets(summaries, {
        headroomPct,
        roundMs,
        minimumRunsForConfidence,
    });
    const inferredBudgets = inferCurrentBudgetsFromSummaries(summaries);
    const effectiveCurrentBudgets = Number.isFinite(currentFcpBudget) && Number.isFinite(currentLcpBudget)
        ? { fcpMs: currentFcpBudget, lcpMs: currentLcpBudget }
        : inferredBudgets;

    if (effectiveCurrentBudgets) {
        recommendation.thresholdHealth = {
            current: {
                budgets: effectiveCurrentBudgets,
                ...computeBudgetFailureStats(summaries, effectiveCurrentBudgets),
            },
            recommended: {
                budgets: recommendation.recommendedBudgets,
                ...computeBudgetFailureStats(summaries, recommendation.recommendedBudgets),
            },
        };
    }
    recommendation.selection = selection;
    const resolvedOutputPath = writeRecommendation(recommendation, outputPath);

    console.log(`Loaded ${selection.loadedRunCount} performance summary file(s).`);
    console.log(`Selected ${selection.selectedRunCount} run(s) for recommendation.`);
    if (selection.windowDays) {
        console.log(`Selection filter: last ${selection.windowDays} day(s).`);
        if (selection.droppedWithoutTimestamp) {
            console.warn(`Dropped ${selection.droppedWithoutTimestamp} run(s) without timestamps.`);
        }
        if (selection.droppedOutsideWindow) {
            console.log(`Dropped ${selection.droppedOutsideWindow} run(s) outside the recency window.`);
        }
    }
    if (selection.maxRecentRuns) {
        console.log(`Selection cap: most recent ${selection.maxRecentRuns} run(s).`);
    }
    console.log(`Observed FCP p95: ${formatMs(recommendation.observed.fcp.p95)}`);
    console.log(`Observed LCP p95: ${formatMs(recommendation.observed.lcp.p95)}`);
    console.log(`Recommendation confidence: ${recommendation.confidence}`);
    recommendation.notes.forEach((note) => console.warn(note));
    console.log(`Recommended budgets: FCP <= ${recommendation.recommendedBudgets.fcpMs}ms, LCP <= ${recommendation.recommendedBudgets.lcpMs}ms`);
    if (recommendation.thresholdHealth) {
        const current = recommendation.thresholdHealth.current;
        const recommended = recommendation.thresholdHealth.recommended;
        console.log(
            `Current-budget failure rate: ${current.failureRatePct}% (${current.failingRuns}/${current.totalRuns}) at FCP<=${current.budgets.fcpMs}ms LCP<=${current.budgets.lcpMs}ms`,
        );
        console.log(
            `Recommended-budget failure rate: ${recommended.failureRatePct}% (${recommended.failingRuns}/${recommended.totalRuns}) at FCP<=${recommended.budgets.fcpMs}ms LCP<=${recommended.budgets.lcpMs}ms`,
        );
    }
    console.log(`Suggested CI env:\nPERF_BUDGET_FCP_MS=${recommendation.recommendedBudgets.fcpMs}\nPERF_BUDGET_LCP_MS=${recommendation.recommendedBudgets.lcpMs}`);
    console.log(`Recommendation written to ${resolvedOutputPath}`);
};

const isDirectExecution = !process.env.VITEST &&
    path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);

if (isDirectExecution) {
    try {
        run();
    } catch (error) {
        console.error(`Failed to recommend performance budgets: ${error.message}`);
        process.exit(1);
    }
}
