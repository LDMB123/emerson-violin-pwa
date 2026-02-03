import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { pathToFileURL } from 'url';
import { buildReport, loadPerfPayload } from './perf-report.js';

const args = process.argv.slice(2);
const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
};

const inputPath = getArg('--input');
if (!inputPath) {
    console.error('Usage: node scripts/qa/perf-bundle.js --input <perf-json> [--screenshot <png>] [--screenshots-dir <dir>] [--output-dir <dir>]');
    process.exit(1);
}

const screenshotPath = getArg('--screenshot');
const screenshotsDir = getArg('--screenshots-dir');
const outputDirArg = getArg('--output-dir');
const distDir = getArg('--dist') || 'dist';

const gzipSize = (buffer) => zlib.gzipSync(buffer).length;
const toKb = (bytes) => bytes / 1024;

const ensureDir = async (dir) => {
    await fs.mkdir(dir, { recursive: true });
};

const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walk(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
};

const readJson = async (filePath) => {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
};

const readAssetBytes = async (filePath) => {
    const buffer = await fs.readFile(filePath);
    return {
        raw: buffer.length,
        gzip: gzipSize(buffer),
    };
};

const parseInitialAssets = async (distRoot) => {
    const indexPath = path.join(distRoot, 'index.html');
    const html = await fs.readFile(indexPath, 'utf8');
    const scriptMatches = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)];
    const styleMatches = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)];
    const scriptSrcs = scriptMatches.map((match) => match[1]);
    const styleHrefs = styleMatches.map((match) => match[1]);
    const resolveAsset = (assetPath) => {
        const cleaned = assetPath.replace(/^\.\//, '').replace(/^\//, '');
        return path.join(distRoot, cleaned);
    };
    return {
        scripts: scriptSrcs.map(resolveAsset),
        styles: styleHrefs.map(resolveAsset),
    };
};

const summarizeAssets = async (distRoot) => {
    const files = await walk(distRoot);
    const totals = {
        js: { raw: 0, gzip: 0 },
        css: { raw: 0, gzip: 0 },
        wasm: { raw: 0, gzip: 0 },
    };
    const details = [];

    for (const file of files) {
        const ext = path.extname(file);
        if (!['.js', '.css', '.wasm'].includes(ext)) continue;
        const sizes = await readAssetBytes(file);
        details.push({ file, ext, ...sizes });
        if (ext === '.js') {
            totals.js.raw += sizes.raw;
            totals.js.gzip += sizes.gzip;
        } else if (ext === '.css') {
            totals.css.raw += sizes.raw;
            totals.css.gzip += sizes.gzip;
        } else if (ext === '.wasm') {
            totals.wasm.raw += sizes.raw;
            totals.wasm.gzip += sizes.gzip;
        }
    }

    details.sort((a, b) => b.gzip - a.gzip);

    const initialAssets = await parseInitialAssets(distRoot);
    const initial = { js: { raw: 0, gzip: 0 }, css: { raw: 0, gzip: 0 } };

    for (const script of initialAssets.scripts) {
        try {
            const sizes = await readAssetBytes(script);
            initial.js.raw += sizes.raw;
            initial.js.gzip += sizes.gzip;
        } catch {
            continue;
        }
    }

    for (const style of initialAssets.styles) {
        try {
            const sizes = await readAssetBytes(style);
            initial.css.raw += sizes.raw;
            initial.css.gzip += sizes.gzip;
        } catch {
            continue;
        }
    }

    return { totals, details, initial };
};

const readBuildMeta = async () => {
    const meta = {
        package: null,
        budgets: null,
        dist: null,
        git: null,
    };

    try {
        meta.package = await readJson(path.resolve('package.json'));
    } catch {
        meta.package = null;
    }

    try {
        meta.budgets = await readJson(path.resolve('scripts/build/budgets.json'));
    } catch {
        meta.budgets = null;
    }

    const distRoot = path.resolve(distDir);
    try {
        await fs.access(distRoot);
        const { totals, details, initial } = await summarizeAssets(distRoot);
        meta.dist = {
            root: distRoot,
            initialJsGzipKb: toKb(initial.js.gzip),
            totalJsGzipKb: toKb(totals.js.gzip),
            totalCssGzipKb: toKb(totals.css.gzip),
            totalWasmGzipKb: toKb(totals.wasm.gzip),
            largest: details.slice(0, 8).map((entry) => ({
                file: path.relative(distRoot, entry.file),
                gzipKb: toKb(entry.gzip),
            })),
        };
    } catch {
        meta.dist = { root: distRoot, available: false };
    }

    return meta;
};

const copyIfExists = async (source, target) => {
    if (!source) return false;
    try {
        await fs.copyFile(source, target);
        return true;
    } catch {
        return false;
    }
};

const copyDirectory = async (sourceDir, targetDir) => {
    try {
        const entries = await fs.readdir(sourceDir, { withFileTypes: true });
        await ensureDir(targetDir);
        for (const entry of entries) {
            if (!entry.isFile()) continue;
            const src = path.join(sourceDir, entry.name);
            const dst = path.join(targetDir, entry.name);
            await fs.copyFile(src, dst);
        }
        return true;
    } catch {
        return false;
    }
};

const main = async () => {
    const payload = await loadPerfPayload(inputPath);
    const exportedAt = payload.exportedAt || Date.now();
    const date = new Date(exportedAt);
    const stamp = date.toISOString().replace(/[:T]/g, '-').slice(0, 16);
    const outputDir = outputDirArg
        ? path.resolve(outputDirArg)
        : path.resolve('docs', 'reports', 'qa', 'perf', stamp);

    await ensureDir(outputDir);

    const report = buildReport(payload);
    const reportPath = path.join(outputDir, 'perf-report.md');
    await fs.writeFile(reportPath, report, 'utf8');

    const perfJsonPath = path.join(outputDir, 'perf.json');
    await fs.writeFile(perfJsonPath, JSON.stringify(payload, null, 2), 'utf8');

    const buildMeta = await readBuildMeta();
    const metaPath = path.join(outputDir, 'build-meta.json');
    await fs.writeFile(metaPath, JSON.stringify(buildMeta, null, 2), 'utf8');

    if (screenshotPath) {
        const ext = path.extname(screenshotPath) || '.png';
        await copyIfExists(path.resolve(screenshotPath), path.join(outputDir, `screenshot${ext}`));
    }

    if (screenshotsDir) {
        await copyDirectory(path.resolve(screenshotsDir), path.join(outputDir, 'screenshots'));
    }

    console.log(`[perf-bundle] Wrote ${outputDir}`);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error('[perf-bundle] Failed', error);
        process.exit(1);
    });
}
