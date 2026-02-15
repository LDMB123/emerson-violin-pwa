#!/usr/bin/env node
import { execSync } from 'node:child_process';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

let stashesText = '';
try {
  stashesText = run('git stash list');
} catch (error) {
  console.error('[stash-audit] failed to run git stash list');
  console.error(error?.message || error);
  process.exit(1);
}

const stashCount = stashesText ? stashesText.split('\n').filter(Boolean).length : 0;
const maxAllowed = Number(process.env.STASH_AUDIT_MAX_STASHES || 50);

console.log(`[stash-audit] found ${stashCount} stashes`);
if (maxAllowed >= 0 && stashCount > maxAllowed) {
  console.error('[stash-audit] too many stashes on this repo');
  console.error(`[stash-audit] hard limit: ${maxAllowed}`);
  console.error('[stash-audit] inspect with "git stash list" and clear with "git stash clear"');
  process.exit(1);
}

if (stashCount > 0) {
  console.log('[stash-audit] stashes present; audit passed (non-fatal).');
}

process.exit(0);
