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

const PERFORMANCE_BUDGET_KEYS = [
    'PERF_BUDGET_FCP_MS',
    'PERF_BUDGET_LCP_MS',
    'PERF_BUDGET_CURRENT_FCP_MS',
    'PERF_BUDGET_CURRENT_LCP_MS',
    'PERF_BUDGET_RECOMMENDATION_PR_TARGET_FAILURE_PCT',
    'PERF_BUDGET_RECOMMENDATION_MAX_TIGHTEN_PCT',
    'PERF_BUDGET_RECOMMENDATION_MAX_LOOSEN_PCT',
];

const extractSingleQuotedValue = (source, key) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = source.match(new RegExp(`${escapedKey}:\\s*'([^']+)'`));
    return match ? match[1] : null;
};

export const countPerformanceBudgetKeyOccurrences = (workflowSource) => {
    const countForKey = (key) => {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = workflowSource.match(new RegExp(`${escapedKey}:\\s*'[^']+'`, 'g'));
        return matches ? matches.length : 0;
    };
    return PERFORMANCE_BUDGET_KEYS.reduce((accumulator, key) => {
        accumulator[key] = countForKey(key);
        return accumulator;
    }, {});
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

export const validatePerformanceBudgetKeyOccurrences = (keyOccurrences) => {
    const issues = [];
    PERFORMANCE_BUDGET_KEYS.forEach((key) => {
        const count = keyOccurrences?.[key] ?? 0;
        if (count === 0) {
            issues.push(`Missing ${key} in workflow config.`);
        } else if (count > 1) {
            issues.push(`Duplicate ${key} entries found (${count}).`);
        }
    });
    return issues;
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
    if (Number.isFinite(thresholds.fcpMs) && Number.isFinite(thresholds.lcpMs) && thresholds.lcpMs < thresholds.fcpMs) {
        issues.push(`Threshold ordering invalid: PERF_BUDGET_LCP_MS=${thresholds.lcpMs} is lower than PERF_BUDGET_FCP_MS=${thresholds.fcpMs}.`);
    }
    if (Number.isFinite(current.fcpMs) && Number.isFinite(current.lcpMs) && current.lcpMs < current.fcpMs) {
        issues.push(`Current threshold ordering invalid: PERF_BUDGET_CURRENT_LCP_MS=${current.lcpMs} is lower than PERF_BUDGET_CURRENT_FCP_MS=${current.fcpMs}.`);
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
    if (
        Number.isFinite(recommendation.maxTightenPct) &&
        Number.isFinite(recommendation.maxLoosenPct) &&
        recommendation.maxLoosenPct < recommendation.maxTightenPct
    ) {
        issues.push(
            `Guardrail ordering invalid: PERF_BUDGET_RECOMMENDATION_MAX_LOOSEN_PCT=${recommendation.maxLoosenPct} ` +
            `is lower than PERF_BUDGET_RECOMMENDATION_MAX_TIGHTEN_PCT=${recommendation.maxTightenPct}.`,
        );
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
    const keyOccurrences = countPerformanceBudgetKeyOccurrences(workflowSource);
    const issues = [
        ...validatePerformanceBudgetKeyOccurrences(keyOccurrences),
        ...validatePerformanceBudgetConfig(config),
    ];

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
