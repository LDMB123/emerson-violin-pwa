#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const releaseCriticalFiles = [
    'tests/e2e/games-all-functional.spec.js',
    'tests/e2e/practice-functional.spec.js',
    'tests/e2e/games-functional.spec.js',
    'tests/e2e/song-mastery-flow.spec.js',
    'tests/e2e/runtime-health.spec.js',
    'tests/e2e/progress-offline.spec.js',
    'tests/e2e/kid-first-layout.spec.js',
    'tests/e2e/songs-catalog-functional.spec.js',
];

const skipPattern = /\b(?:test|describe|it)\.skip\s*\(/u;
const failures = releaseCriticalFiles.filter((relativePath) => {
    const source = readFileSync(resolve(root, relativePath), 'utf8');
    return skipPattern.test(source);
});

if (failures.length > 0) {
    console.error('Release test gate audit failed:');
    failures.forEach((relativePath) => console.error(`- Remove skipped release-critical tests from ${relativePath}.`));
    process.exit(1);
}

console.log('Release test gate audit passed.');
