#!/usr/bin/env node

import { execSync } from 'node:child_process';

const run = (command) => execSync(command, { encoding: 'utf8' }).trim();

const status = {
    branch: run('git branch --show-current'),
    commit: run('git rev-parse --short HEAD'),
    worktree_clean: run('git status --porcelain').length === 0,
    timestamp_utc: new Date().toISOString(),
    node: process.version,
    npm: run('npm --version'),
};

console.log('Panda Violin PWA Handoff Status');
console.log('--------------------------------');
console.log(`Branch: ${status.branch}`);
console.log(`Commit: ${status.commit}`);
console.log(`Worktree clean: ${status.worktree_clean ? 'yes' : 'no'}`);
console.log(`Timestamp (UTC): ${status.timestamp_utc}`);
console.log(`Node: ${status.node}`);
console.log(`npm: ${status.npm}`);
console.log('');
console.log('Runbook: docs/HANDOFF.md');
console.log('Full verification: npm run handoff:verify');
