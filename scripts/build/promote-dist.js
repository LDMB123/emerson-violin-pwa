import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);

const getArg = (flag, fallback) => {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx === args.length - 1) return fallback;
  return args[idx + 1];
};

const src = path.resolve(getArg('--src', 'dist-build'));
const dest = path.resolve(getArg('--dest', 'dist'));

const exists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

const main = async () => {
  if (!(await exists(src))) {
    console.error(`[promote-dist] Source folder not found: ${src}`);
    process.exit(1);
  }

  await fs.mkdir(dest, { recursive: true });
  await fs.cp(src, dest, { recursive: true, force: true });

  const stageDir = path.join(dest, '.stage');
  if (await exists(stageDir)) {
    await fs.rm(stageDir, { recursive: true, force: true });
  }

  console.log(`[promote-dist] Copied ${src} -> ${dest}`);
};

main().catch((error) => {
  console.error('[promote-dist] Failed:', error.message || error);
  process.exit(1);
});
