import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const rootArgIndex = args.indexOf("--root");
const root = rootArgIndex >= 0 && args[rootArgIndex + 1]
  ? path.resolve(args[rootArgIndex + 1])
  : process.cwd();
const topArgIndex = args.indexOf("--top");
const topCount = topArgIndex >= 0 && args[topArgIndex + 1]
  ? Number(args[topArgIndex + 1])
  : 10;

const ignoreFile = path.join(root, "docs", "ai", "IGNORE.md");
const ignoreTokens = readIgnoreTokens(ignoreFile);

const textExts = new Set([
  ".md",
  ".txt",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".tsx",
  ".json",
  ".toml",
  ".yml",
  ".yaml",
  ".rs",
  ".svg",
  ".webmanifest",
]);

const lockNames = new Set(["package-lock.json", "Cargo.lock"]);

const included = [];
const ignored = [];

walk(root, "");

const includedTotals = sumStats(included);
const ignoredTotals = sumStats(ignored);

printSummary("In-scope", includedTotals);
printSummary("Ignored", ignoredTotals);
printTop("Top included files", included, topCount);
printTop("Top ignored files", ignored, topCount);

function readIgnoreTokens(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  const tokens = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) continue;
    const matches = trimmed.match(/`([^`]+)`/g) || [];
    for (const match of matches) {
      tokens.push(match.replace(/`/g, ""));
    }
  }
  return tokens;
}

function walk(dir, relBase) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relBase, entry.name);
    if (isIgnored(relPath)) {
      if (entry.isFile() && isTextFile(entry.name)) {
        pushFile(ignored, fullPath, relPath);
      }
      continue;
    }
    if (entry.isDirectory()) {
      walk(fullPath, relPath);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!isTextFile(entry.name)) continue;
    pushFile(included, fullPath, relPath);
  }
}

function isTextFile(name) {
  if (lockNames.has(name)) return true;
  return textExts.has(path.extname(name).toLowerCase());
}

function isIgnored(relPath) {
  return ignoreTokens.some((token) => relPath.includes(token));
}

function pushFile(bucket, fullPath, relPath) {
  let size = 0;
  try {
    size = fs.statSync(fullPath).size;
  } catch {
    return;
  }
  bucket.push({ relPath, size });
}

function sumStats(files) {
  const totalChars = files.reduce((sum, f) => sum + f.size, 0);
  return {
    fileCount: files.length,
    totalChars,
    estimatedTokens: Math.floor(totalChars / 4),
  };
}

function printSummary(label, stats) {
  console.log(`${label} files: ${stats.fileCount}`);
  console.log(`${label} chars: ${stats.totalChars}`);
  console.log(`${label} tokens (chars/4): ${stats.estimatedTokens}`);
  console.log("");
}

function printTop(title, files, count) {
  console.log(`${title}:`);
  const sorted = [...files].sort((a, b) => b.size - a.size).slice(0, count);
  if (!sorted.length) {
    console.log("- none");
    console.log("");
    return;
  }
  for (const file of sorted) {
    console.log(`- ${file.size}  ${file.relPath}`);
  }
  console.log("");
}
