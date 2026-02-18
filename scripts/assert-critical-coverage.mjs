#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const summaryPath = resolve(process.cwd(), 'coverage/coverage-summary.json');

const thresholds = {
    'src/utils/app-utils.js': { lines: 100, functions: 100 },
    'src/views/view-loader.js': { lines: 90, functions: 80 },
    'src/ml/recommendations.js': { lines: 80, functions: 60 },
    'src/onboarding/onboarding-check.js': { lines: 100, functions: 100 },
    'src/onboarding/onboarding.js': { lines: 35, functions: 30 },
};

const metricKeyMap = {
    lines: 'lines',
    functions: 'functions',
    branches: 'branches',
    statements: 'statements',
};

const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const failures = [];
const findCoverageEntry = (file) => {
    const absolutePath = resolve(process.cwd(), file);
    if (summary[absolutePath]) return summary[absolutePath];
    return Object.entries(summary).find(([key]) => key.endsWith(`/${file}`))?.[1] || null;
};

Object.entries(thresholds).forEach(([file, expected]) => {
    const data = findCoverageEntry(file);
    if (!data) {
        failures.push(`${file}: missing from coverage summary`);
        return;
    }

    Object.entries(expected).forEach(([metric, minimum]) => {
        const metricKey = metricKeyMap[metric];
        const current = data?.[metricKey]?.pct;
        if (typeof current !== 'number') {
            failures.push(`${file}: missing metric "${metric}"`);
            return;
        }
        if (current < minimum) {
            failures.push(
                `${file}: ${metric} ${current.toFixed(2)}% < required ${minimum}%`,
            );
        }
    });
});

if (failures.length) {
    console.error('Critical coverage thresholds failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
}

console.log('Critical coverage thresholds passed.');
