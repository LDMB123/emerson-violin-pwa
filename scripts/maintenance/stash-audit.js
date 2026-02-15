import { execFileSync } from 'node:child_process';

const MB = 1024 * 1024;
const warnMB = Number.parseInt(process.env.STASH_AUDIT_WARN_MB ?? '500', 10);
const warnBytes = Number.isFinite(warnMB) ? warnMB * MB : 500 * MB;

const stashes = readLines(['stash', 'list'])
  .map((line) => line.split(':')[0].trim())
  .filter(Boolean);

if (!stashes.length) {
  console.log('[stash-audit] no stashes found');
  process.exit(0);
}

let totalBytes = 0;
const rows = [];

for (const stashRef of stashes) {
  const objects = readLines(['rev-list', '--objects', stashRef]);
  const objectIds = objects
    .map((line) => line.split(' ')[0]?.trim())
    .filter(Boolean);

  if (!objectIds.length) {
    rows.push({ stashRef, bytes: 0 });
    continue;
  }

  const batchInput = `${objectIds.join('\n')}\n`;
  const batchOutput = execFileSync(
    'git',
    ['cat-file', '--batch-check=%(objecttype) %(objectsize)'],
    {
      encoding: 'utf8',
      input: batchInput,
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  let bytes = 0;
  for (const line of batchOutput.split('\n')) {
    const [type, sizeRaw] = line.trim().split(' ');
    if (type !== 'blob') continue;
    const size = Number.parseInt(sizeRaw, 10);
    if (Number.isFinite(size)) bytes += size;
  }

  rows.push({ stashRef, bytes });
  totalBytes += bytes;
}

rows.sort((a, b) => b.bytes - a.bytes);

console.log('[stash-audit] stash payload estimate (blob bytes)');
for (const row of rows) {
  const marker = row.bytes >= warnBytes ? ' !!' : '';
  console.log(
    `- ${row.stashRef}: ${formatBytes(row.bytes)}${marker}`
  );
}

console.log(`[stash-audit] total: ${formatBytes(totalBytes)}`);
console.log(
  `[stash-audit] warning threshold: ${formatBytes(warnBytes)} (set STASH_AUDIT_WARN_MB to override)`
);

if (totalBytes >= warnBytes) {
  console.log('[stash-audit] warning: stash size is above threshold');
  process.exitCode = 2;
}

function readLines(args) {
  const output = execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let unitIndex = -1;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}
