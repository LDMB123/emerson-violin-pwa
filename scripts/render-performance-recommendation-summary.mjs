import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const safeValue = (value, fallback = 'n/a') => (value === null || value === undefined ? fallback : value);

const modeLabel = (mode) => {
    if (mode === 'consider_blocking') return 'Consider Blocking';
    if (mode === 'report_only') return 'Report Only';
    return 'Unknown';
};

export const buildRecommendationSummaryMarkdown = (recommendation) => {
    const suggestedBudgets = recommendation?.suggestedBudgets ?? recommendation?.recommendedBudgets ?? null;
    const hasRawBudgets = Number.isFinite(recommendation?.recommendedBudgets?.fcpMs) &&
        Number.isFinite(recommendation?.recommendedBudgets?.lcpMs);
    const showGuardrailDelta = recommendation?.guardrails?.adjusted === true &&
        hasRawBudgets &&
        Number.isFinite(suggestedBudgets?.fcpMs) &&
        Number.isFinite(suggestedBudgets?.lcpMs);
    const selectedRuns = safeValue(recommendation?.selection?.selectedRunCount);
    const loadedRuns = safeValue(recommendation?.selection?.loadedRunCount);
    const confidence = safeValue(recommendation?.confidence, 'unknown');
    const suggestedFcp = safeValue(suggestedBudgets?.fcpMs);
    const suggestedLcp = safeValue(suggestedBudgets?.lcpMs);
    const recommendedFcp = safeValue(recommendation?.recommendedBudgets?.fcpMs);
    const recommendedLcp = safeValue(recommendation?.recommendedBudgets?.lcpMs);
    const prMode = recommendation?.prGateRecommendation?.mode;
    const prReason = safeValue(recommendation?.prGateRecommendation?.reason, 'none');
    const prTarget = safeValue(recommendation?.prGateRecommendation?.targetFailureRatePct);
    const currentHealth = recommendation?.thresholdHealth?.current ?? null;
    const recommendedHealth = recommendation?.thresholdHealth?.recommended ?? null;

    const lines = [
        '## Performance Budget Recommendation',
        '',
        `- Runs used: ${selectedRuns} selected / ${loadedRuns} loaded`,
        `- Confidence: ${confidence}`,
        `- Suggested budgets: FCP <= ${suggestedFcp}ms, LCP <= ${suggestedLcp}ms`,
        `- PR gate recommendation: ${modeLabel(prMode)} (${prReason}), target failure rate <= ${prTarget}%`,
    ];

    if (showGuardrailDelta) {
        lines.push(`- Raw recommendation before guardrails: FCP <= ${recommendedFcp}ms, LCP <= ${recommendedLcp}ms`);
    }

    if (currentHealth && recommendedHealth) {
        lines.push(
            `- Current threshold failure rate: ${safeValue(currentHealth.failureRatePct)}% (${safeValue(currentHealth.failingRuns)}/${safeValue(currentHealth.totalRuns)})`,
            `- Recommended threshold failure rate: ${safeValue(recommendedHealth.failureRatePct)}% (${safeValue(recommendedHealth.failingRuns)}/${safeValue(recommendedHealth.totalRuns)})`,
        );
    }

    if (Array.isArray(recommendation?.notes) && recommendation.notes.length > 0) {
        lines.push('', '### Notes');
        recommendation.notes.forEach((note) => lines.push(`- ${note}`));
    }

    lines.push('', '### Suggested CI Variables', '', '```bash');
    lines.push(`PERF_BUDGET_FCP_MS=${suggestedFcp}`);
    lines.push(`PERF_BUDGET_LCP_MS=${suggestedLcp}`);
    lines.push('```');

    return `${lines.join('\n')}\n`;
};

const run = () => {
    const inputPath = process.argv[2] || 'artifacts/perf-budget-recommendation.json';
    const outputPath = process.env.PERF_BUDGET_RECOMMENDATION_SUMMARY_OUTPUT || 'artifacts/perf-budget-recommendation.md';
    const resolvedInputPath = path.resolve(inputPath);
    const resolvedOutputPath = path.resolve(outputPath);
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;

    if (!fs.existsSync(resolvedInputPath)) {
        console.warn(`Recommendation file not found: ${resolvedInputPath}`);
        return;
    }

    const raw = fs.readFileSync(resolvedInputPath, 'utf8');
    const recommendation = JSON.parse(raw);
    const markdown = buildRecommendationSummaryMarkdown(recommendation);

    fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
    fs.writeFileSync(resolvedOutputPath, markdown);

    if (summaryPath) {
        fs.appendFileSync(summaryPath, `${markdown}\n`);
        console.log(`Wrote recommendation summary to ${summaryPath}`);
    } else {
        console.log(markdown);
    }

    console.log(`Recommendation summary written to ${resolvedOutputPath}`);
};

const isDirectExecution = !process.env.VITEST &&
    path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);

if (isDirectExecution) {
    try {
        run();
    } catch (error) {
        console.error(`Failed to render performance recommendation summary: ${error.message}`);
        process.exit(1);
    }
}
