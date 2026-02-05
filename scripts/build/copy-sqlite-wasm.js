import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist');
const targetDir = path.join(rootDir, 'public', 'sqlite');

const files = [
  'index.mjs',
  'sqlite3.wasm',
  'sqlite3-worker1.mjs',
  'sqlite3-opfs-async-proxy.js',
];

if (!fs.existsSync(sourceDir)) {
  console.error('[sqlite] Source directory missing:', sourceDir);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
let copied = 0;

for (const file of files) {
  const src = path.join(sourceDir, file);
  const dest = path.join(targetDir, file);
  if (!fs.existsSync(src)) {
    console.warn(`[sqlite] Missing ${file}, skipping`);
    continue;
  }
  fs.copyFileSync(src, dest);
  copied += 1;
}

console.log(`[sqlite] Copied ${copied} files to ${path.relative(rootDir, targetDir)}`);
