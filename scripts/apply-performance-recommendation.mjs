import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FCP_PATTERN = /PERF_BUDGET_FCP_MS:\s*'[^']+'/;
const LCP_PATTERN = /PERF_BUDGET_LCP_MS:\s*'[^']+'/;
const CURRENT_FCP_PATTERN = /PERF_BUDGET_CURRENT_FCP_MS:\s*'[^']+'/;
const CURRENT_LCP_PATTERN = /PERF_BUDGET_CURRENT_LCP_MS:\s*'[^']+'/;

const countMatches = (source, pattern) => {
    const globalFlags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const matcher = new RegExp(pattern.source, globalFlags);
    return Array.from(source.matchAll(matcher)).length;
};

const asPositiveInt = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Expected a positive integer budget value, received: ${value}`);
    }
    return parsed;
};

export const applyBudgetsToWorkflow = (workflowSource, { fcpMs, lcpMs }) => {
    if (typeof workflowSource !== 'string' || workflowSource.length === 0) {
        throw new Error('Workflow source is empty.');
    }
    const fcpKeyCount = countMatches(workflowSource, FCP_PATTERN);
    const lcpKeyCount = countMatches(workflowSource, LCP_PATTERN);
    if (fcpKeyCount !== 1 || lcpKeyCount !== 1) {
        throw new Error(
            `Expected exactly one PERF_BUDGET_FCP_MS / PERF_BUDGET_LCP_MS entry; ` +
            `found FCP=${fcpKeyCount}, LCP=${lcpKeyCount}.`,
        );
    }
    const currentFcpKeyCount = countMatches(workflowSource, CURRENT_FCP_PATTERN);
    const currentLcpKeyCount = countMatches(workflowSource, CURRENT_LCP_PATTERN);
    if (currentFcpKeyCount !== currentLcpKeyCount) {
        throw new Error('Found only one PERF_BUDGET_CURRENT_* key; expected both or neither.');
    }
    if (currentFcpKeyCount > 1 || currentLcpKeyCount > 1) {
        throw new Error(
            `Expected at most one PERF_BUDGET_CURRENT_* entry pair; ` +
            `found CURRENT_FCP=${currentFcpKeyCount}, CURRENT_LCP=${currentLcpKeyCount}.`,
        );
    }

    let updatedWorkflowSource = workflowSource
        .replace(FCP_PATTERN, `PERF_BUDGET_FCP_MS: '${fcpMs}'`)
        .replace(LCP_PATTERN, `PERF_BUDGET_LCP_MS: '${lcpMs}'`);

    if (currentFcpKeyCount === 1 && currentLcpKeyCount === 1) {
        updatedWorkflowSource = updatedWorkflowSource
            .replace(CURRENT_FCP_PATTERN, `PERF_BUDGET_CURRENT_FCP_MS: '${fcpMs}'`)
            .replace(CURRENT_LCP_PATTERN, `PERF_BUDGET_CURRENT_LCP_MS: '${lcpMs}'`);
    }

    return updatedWorkflowSource;
};

export const assertRecommendationIsApplySafe = (recommendation, { allowLowConfidence = false } = {}) => {
    const confidence = recommendation?.confidence;
    if (confidence === 'high' || allowLowConfidence) {
        return;
    }
    const selectedRuns = recommendation?.selection?.selectedRunCount ?? 0;
    throw new Error(
        `Recommendation confidence is "${confidence || 'unknown'}" with ${selectedRuns} selected run(s). ` +
        'Refusing to apply automatically; set PERF_BUDGET_APPLY_ALLOW_LOW_CONFIDENCE=true to override.',
    );
};

export const selectBudgetsForApply = (recommendation) => {
    const suggested = recommendation?.suggestedBudgets;
    const recommended = recommendation?.recommendedBudgets;
    const useSuggested = Number.isFinite(suggested?.fcpMs) && Number.isFinite(suggested?.lcpMs);
    const source = useSuggested ? 'suggestedBudgets' : 'recommendedBudgets';
    const selected = useSuggested ? suggested : recommended;

    return {
        source,
        fcpMs: asPositiveInt(selected?.fcpMs),
        lcpMs: asPositiveInt(selected?.lcpMs),
    };
};

const run = () => {
    const inputPath = process.argv[2] || 'artifacts/perf-budget-recommendation.json';
    const workflowPath = process.argv[3] || '.github/workflows/quality.yml';
    const dryRun = process.env.PERF_BUDGET_APPLY_DRY_RUN === 'true';
    const allowLowConfidence = process.env.PERF_BUDGET_APPLY_ALLOW_LOW_CONFIDENCE === 'true';

    const resolvedInputPath = path.resolve(inputPath);
    const resolvedWorkflowPath = path.resolve(workflowPath);

    if (!fs.existsSync(resolvedInputPath)) {
        throw new Error(`Recommendation file does not exist: ${resolvedInputPath}`);
    }
    if (!fs.existsSync(resolvedWorkflowPath)) {
        throw new Error(`Workflow file does not exist: ${resolvedWorkflowPath}`);
    }

    const recommendation = JSON.parse(fs.readFileSync(resolvedInputPath, 'utf8'));
    assertRecommendationIsApplySafe(recommendation, { allowLowConfidence });
    const { source, fcpMs, lcpMs } = selectBudgetsForApply(recommendation);

    const workflowSource = fs.readFileSync(resolvedWorkflowPath, 'utf8');
    const currentBudgetKeysPresent =
        countMatches(workflowSource, CURRENT_FCP_PATTERN) === 1 &&
        countMatches(workflowSource, CURRENT_LCP_PATTERN) === 1;
    const updatedWorkflowSource = applyBudgetsToWorkflow(workflowSource, { fcpMs, lcpMs });

    if (!dryRun) {
        fs.writeFileSync(resolvedWorkflowPath, updatedWorkflowSource);
    }

    const mode = dryRun ? 'Dry run' : 'Updated';
    const currentSyncLabel = currentBudgetKeysPresent ? 'current thresholds synced' : 'no current-threshold keys';
    console.log(`${mode} workflow budgets: FCP=${fcpMs}ms, LCP=${lcpMs}ms (${source}; ${currentSyncLabel})`);
    console.log(`Recommendation source: ${resolvedInputPath}`);
    console.log(`Workflow target: ${resolvedWorkflowPath}`);
};

const isDirectExecution = !process.env.VITEST &&
    path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);

if (isDirectExecution) {
    try {
        run();
    } catch (error) {
        console.error(`Failed to apply performance recommendation: ${error.message}`);
        process.exit(1);
    }
}
