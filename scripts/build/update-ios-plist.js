import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

const getVersion = async () => {
  const pkgPath = path.join(repoRoot, "package.json");
  let pkgVersion = "0.0.0";
  try {
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
    pkgVersion = pkg.version || pkgVersion;
  } catch {}
  let gitSha = "";
  try {
    gitSha = execSync("git rev-parse --short HEAD", {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"]
    })
      .toString()
      .trim();
  } catch {}
  return gitSha ? `${pkgVersion}+${gitSha}` : pkgVersion;
};

const updatePlist = async (plistPath, version) => {
  const content = await fs.readFile(plistPath, "utf8");
  const key = "<key>PWAContentVersion</key>";
  if (!content.includes(key)) {
    return false;
  }
  const updated = content.replace(
    /<key>PWAContentVersion<\/key>\\s*<string>[^<]*<\\/string>/,
    `${key}\n    <string>${version}</string>`
  );
  if (updated !== content) {
    await fs.writeFile(plistPath, updated);
    return true;
  }
  return false;
};

const candidates = [
  "native/ios/EmersonViolinShell/Info.plist",
  "native/ios/EmersonViolinShell/Info.plist.sample"
].map((p) => path.resolve(repoRoot, p));

const version = await getVersion();
let updatedAny = false;

for (const file of candidates) {
  try {
    await fs.access(file);
    const updated = await updatePlist(file, version);
    updatedAny = updatedAny || updated;
  } catch {}
}

if (updatedAny) {
  console.log(`Updated PWAContentVersion to ${version}`);
} else {
  console.log("No Info.plist found or no PWAContentVersion key to update.");
}
