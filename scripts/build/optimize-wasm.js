import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import zlib from 'node:zlib';

const args = process.argv.slice(2);
const distFlagIndex = args.indexOf('--dist');
const distDir = distFlagIndex !== -1 && args[distFlagIndex + 1]
  ? args[distFlagIndex + 1]
  : (process.env.BUILD_DIST || 'dist');

const distRoot = path.resolve(distDir);

const toKb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const gzipSize = (buffer) => zlib.gzipSync(buffer).length;

const hasWasmOpt = () => {
  const probe = spawnSync('wasm-opt', ['--version'], { stdio: 'ignore' });
  return probe.status === 0;
};

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile() && fullPath.endsWith('.wasm')) {
      files.push(fullPath);
    }
  }
  return files;
};

const shouldOptimize = (filePath) => {
  const normalized = filePath.split(path.sep).join('/');
  if (normalized.includes('/sqlite/')) return false;
  return true;
};

const optimizeOne = async (filePath) => {
  const before = await fs.readFile(filePath);
  const beforeRaw = before.length;
  const beforeGzip = gzipSize(before);

  const optimizedPath = `${filePath}.opt`;
  const result = spawnSync(
    'wasm-opt',
    [
      '-Oz',
      '--strip-debug',
      '--strip-producers',
      '--enable-nontrapping-float-to-int',
      '--enable-bulk-memory',
      '--enable-mutable-globals',
      filePath,
      '-o',
      optimizedPath,
    ],
    { encoding: 'utf8' }
  );

  if (result.status !== 0) {
    await fs.rm(optimizedPath, { force: true });
    throw new Error(result.stderr || result.stdout || `wasm-opt failed for ${filePath}`);
  }

  const after = await fs.readFile(optimizedPath);
  const afterRaw = after.length;
  const afterGzip = gzipSize(after);

  const improvedGzip = afterGzip < beforeGzip;
  const improvedRaw = afterRaw < beforeRaw;
  if (improvedGzip || (improvedRaw && afterGzip <= beforeGzip)) {
    await fs.rename(optimizedPath, filePath);
    return { filePath, beforeRaw, beforeGzip, afterRaw, afterGzip, applied: true };
  }

  await fs.rm(optimizedPath, { force: true });
  return { filePath, beforeRaw, beforeGzip, afterRaw: beforeRaw, afterGzip: beforeGzip, applied: false };
};

const main = async () => {
  try {
    await fs.access(distRoot);
  } catch {
    console.error(`[wasm-opt] Dist folder not found: ${distRoot}`);
    process.exit(1);
  }

  if (!hasWasmOpt()) {
    console.warn('[wasm-opt] wasm-opt not found; skipping optimization');
    process.exit(0);
  }

  const wasmFiles = await walk(distRoot);
  if (!wasmFiles.length) {
    console.log('[wasm-opt] No .wasm files found');
    process.exit(0);
  }

  let totalBeforeRaw = 0;
  let totalAfterRaw = 0;
  let totalBeforeGzip = 0;
  let totalAfterGzip = 0;

  const candidates = wasmFiles.filter(shouldOptimize);
  const skipped = wasmFiles.length - candidates.length;
  console.log(`[wasm-opt] Optimizing ${candidates.length} wasm files${skipped > 0 ? ` (skipped ${skipped})` : ''}`);
  for (const filePath of candidates) {
    const stats = await optimizeOne(filePath);
    totalBeforeRaw += stats.beforeRaw;
    totalAfterRaw += stats.afterRaw;
    totalBeforeGzip += stats.beforeGzip;
    totalAfterGzip += stats.afterGzip;
    const rel = path.relative(distRoot, stats.filePath);
    console.log(
      `[wasm-opt] ${rel}: ${toKb(stats.beforeRaw)} -> ${toKb(stats.afterRaw)} raw, ${toKb(stats.beforeGzip)} -> ${toKb(stats.afterGzip)} gzip${stats.applied ? '' : ' (kept original)'}`
    );
  }

  console.log(
    `[wasm-opt] Total: ${toKb(totalBeforeRaw)} -> ${toKb(totalAfterRaw)} raw, ${toKb(totalBeforeGzip)} -> ${toKb(totalAfterGzip)} gzip`
  );
};

main().catch((error) => {
  console.error('[wasm-opt] Failed:', error.message || error);
  process.exit(1);
});
