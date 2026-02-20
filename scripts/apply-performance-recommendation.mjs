import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FCP_PATTERN = /PERF_BUDGET_FCP_MS:\s*'[^']+'/;
const LCP_PATTERN = /PERF_BUDGET_LCP_MS:\s*'[^']+'/;

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
    if (!FCP_PATTERN.test(workflowSource) || !LCP_PATTERN.test(workflowSource)) {
        throw new Error('Failed to locate PERF_BUDGET_FCP_MS / PERF_BUDGET_LCP_MS in workflow source.');
    }

    return workflowSource
        .replace(FCP_PATTERN, `PERF_BUDGET_FCP_MS: '${fcpMs}'`)
        .replace(LCP_PATTERN, `PERF_BUDGET_LCP_MS: '${lcpMs}'`);
};

const run = () => {
    const inputPath = process.argv[2] || 'artifacts/perf-budget-recommendation.json';
    const workflowPath = process.argv[3] || '.github/workflows/quality.yml';
    const dryRun = process.env.PERF_BUDGET_APPLY_DRY_RUN === 'true';

    const resolvedInputPath = path.resolve(inputPath);
    const resolvedWorkflowPath = path.resolve(workflowPath);

    if (!fs.existsSync(resolvedInputPath)) {
        throw new Error(`Recommendation file does not exist: ${resolvedInputPath}`);
    }
    if (!fs.existsSync(resolvedWorkflowPath)) {
        throw new Error(`Workflow file does not exist: ${resolvedWorkflowPath}`);
    }

    const recommendation = JSON.parse(fs.readFileSync(resolvedInputPath, 'utf8'));
    const fcpMs = asPositiveInt(recommendation?.recommendedBudgets?.fcpMs);
    const lcpMs = asPositiveInt(recommendation?.recommendedBudgets?.lcpMs);

    const workflowSource = fs.readFileSync(resolvedWorkflowPath, 'utf8');
    const updatedWorkflowSource = applyBudgetsToWorkflow(workflowSource, { fcpMs, lcpMs });

    if (!dryRun) {
        fs.writeFileSync(resolvedWorkflowPath, updatedWorkflowSource);
    }

    const mode = dryRun ? 'Dry run' : 'Updated';
    console.log(`${mode} workflow budgets: FCP=${fcpMs}ms, LCP=${lcpMs}ms`);
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
