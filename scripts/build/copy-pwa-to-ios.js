import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) return fallback;
  return args[index + 1];
};

const src = path.resolve(repoRoot, getArg("--src", "dist"));
const dest = path.resolve(
  repoRoot,
  getArg("--dest", "native/ios/EmersonViolinShell/Resources/pwa")
);

const exists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

if (!(await exists(src))) {
  console.error(`Missing source folder: ${src}`);
  process.exit(1);
}

await fs.rm(dest, { recursive: true, force: true });
await fs.mkdir(path.dirname(dest), { recursive: true });
await fs.cp(src, dest, { recursive: true });

const offlineFallback = path.resolve(repoRoot, "public/offline.html");
const offlineTarget = path.join(dest, "offline.html");
if (!(await exists(offlineTarget)) && (await exists(offlineFallback))) {
  await fs.copyFile(offlineFallback, offlineTarget);
}

console.log(`Copied PWA assets from ${src} to ${dest}`);
