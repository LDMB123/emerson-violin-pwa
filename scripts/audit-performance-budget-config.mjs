import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const defaultWorkflowPath = path.join(repoRoot, '.github', 'workflows', 'quality.yml');

const parsePositiveInt = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parsePositiveNumber = (value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const extractSingleQuotedValue = (source, key) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = source.match(new RegExp(`${escapedKey}:\\s*'([^']+)'`));
    return match ? match[1] : null;
};

export const readPerformanceBudgetConfig = (workflowSource) => {
    const readInt = (key) => parsePositiveInt(extractSingleQuotedValue(workflowSource, key));
    const readNumber = (key) => parsePositiveNumber(extractSingleQuotedValue(workflowSource, key));

    return {
        thresholds: {
            fcpMs: readInt('PERF_BUDGET_FCP_MS'),
            lcpMs: readInt('PERF_BUDGET_LCP_MS'),
        },
        currentThresholds: {
            fcpMs: readInt('PERF_BUDGET_CURRENT_FCP_MS'),
            lcpMs: readInt('PERF_BUDGET_CURRENT_LCP_MS'),
        },
        recommendation: {
            prTargetFailurePct: readNumber('PERF_BUDGET_RECOMMENDATION_PR_TARGET_FAILURE_PCT'),
            maxTightenPct: readNumber('PERF_BUDGET_RECOMMENDATION_MAX_TIGHTEN_PCT'),
            maxLoosenPct: readNumber('PERF_BUDGET_RECOMMENDATION_MAX_LOOSEN_PCT'),
        },
    };
};

export const validatePerformanceBudgetConfig = (config) => {
    const issues = [];
    const thresholds = config?.thresholds ?? {};
    const current = config?.currentThresholds ?? {};
    const recommendation = config?.recommendation ?? {};

    if (!Number.isFinite(thresholds.fcpMs) || !Number.isFinite(thresholds.lcpMs)) {
        issues.push('Missing PERF_BUDGET_FCP_MS / PERF_BUDGET_LCP_MS values.');
    }
    if (!Number.isFinite(current.fcpMs) || !Number.isFinite(current.lcpMs)) {
        issues.push('Missing PERF_BUDGET_CURRENT_FCP_MS / PERF_BUDGET_CURRENT_LCP_MS values.');
    }

    if (Number.isFinite(thresholds.fcpMs) && Number.isFinite(current.fcpMs) && thresholds.fcpMs !== current.fcpMs) {
        issues.push(`FCP threshold drift: PERF_BUDGET_FCP_MS=${thresholds.fcpMs} but PERF_BUDGET_CURRENT_FCP_MS=${current.fcpMs}.`);
    }
    if (Number.isFinite(thresholds.lcpMs) && Number.isFinite(current.lcpMs) && thresholds.lcpMs !== current.lcpMs) {
        issues.push(`LCP threshold drift: PERF_BUDGET_LCP_MS=${thresholds.lcpMs} but PERF_BUDGET_CURRENT_LCP_MS=${current.lcpMs}.`);
    }

    if (
        !Number.isFinite(recommendation.prTargetFailurePct) ||
        recommendation.prTargetFailurePct <= 0 ||
        recommendation.prTargetFailurePct > 100
    ) {
        issues.push('PERF_BUDGET_RECOMMENDATION_PR_TARGET_FAILURE_PCT must be > 0 and <= 100.');
    }
    if (
        !Number.isFinite(recommendation.maxTightenPct) ||
        recommendation.maxTightenPct <= 0 ||
        recommendation.maxTightenPct > 100
    ) {
        issues.push('PERF_BUDGET_RECOMMENDATION_MAX_TIGHTEN_PCT must be > 0 and <= 100.');
    }
    if (
        !Number.isFinite(recommendation.maxLoosenPct) ||
        recommendation.maxLoosenPct <= 0 ||
        recommendation.maxLoosenPct > 100
    ) {
        issues.push('PERF_BUDGET_RECOMMENDATION_MAX_LOOSEN_PCT must be > 0 and <= 100.');
    }

    return issues;
};

const runAudit = () => {
    const workflowPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultWorkflowPath;
    if (!fs.existsSync(workflowPath)) {
        console.error(`Performance budget config audit failed: workflow file not found at ${workflowPath}`);
        process.exitCode = 1;
        return;
    }

    const workflowSource = fs.readFileSync(workflowPath, 'utf8');
    const config = readPerformanceBudgetConfig(workflowSource);
    const issues = validatePerformanceBudgetConfig(config);

    if (issues.length > 0) {
        console.error('Performance budget config audit failed:');
        issues.forEach((issue) => console.error(`- ${issue}`));
        process.exitCode = 1;
        return;
    }

    console.log(
        `Performance budget config audit passed: FCP=${config.thresholds.fcpMs}ms, ` +
        `LCP=${config.thresholds.lcpMs}ms, PR target=${config.recommendation.prTargetFailurePct}%`,
    );
};

const isDirectExecution = !process.env.VITEST &&
    path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);

if (isDirectExecution) {
    runAudit();
}
