#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const lockfilePath = resolve(process.cwd(), 'package-lock.json');
const lockfile = JSON.parse(readFileSync(lockfilePath, 'utf8'));
const packages = lockfile.packages || {};

const versionsByName = new Map();

for (const [pkgPath, meta] of Object.entries(packages)) {
    if (!pkgPath.startsWith('node_modules/') || !meta?.version) continue;
    const name = pkgPath.slice('node_modules/'.length).split('/node_modules/').pop();
    if (!name) continue;

    if (!versionsByName.has(name)) {
        versionsByName.set(name, new Set());
    }
    versionsByName.get(name).add(meta.version);
}

const duplicates = [...versionsByName.entries()]
    .filter(([, versions]) => versions.size > 1)
    .map(([name, versions]) => ({
        name,
        versions: [...versions].sort(),
    }))
    .sort((a, b) => b.versions.length - a.versions.length || a.name.localeCompare(b.name));

const knownTransitiveDuplicates = new Set(['entities', 'fsevents', 'whatwg-mimetype']);
const unexpected = duplicates.filter((entry) => !knownTransitiveDuplicates.has(entry.name));

if (duplicates.length === 0) {
    console.log('No duplicate package versions found.');
    process.exit(0);
}

console.log('Duplicate package versions detected:');
for (const entry of duplicates) {
    const marker = knownTransitiveDuplicates.has(entry.name) ? 'known' : 'unexpected';
    console.log(`- ${entry.name}: ${entry.versions.join(', ')} (${marker})`);
}

if (unexpected.length > 0) {
    console.error('\nUnexpected duplicate package versions were found. Review dependency graph.');
    process.exit(1);
}

console.log('\nAll duplicates are currently known transitive constraints.');
