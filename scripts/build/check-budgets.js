import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';

const args = process.argv.slice(2);
const distFlagIndex = args.indexOf('--dist');
const distDir = distFlagIndex !== -1 && args[distFlagIndex + 1]
    ? args[distFlagIndex + 1]
    : (process.env.BUILD_DIST || 'dist');
const budgetsPath = path.resolve('scripts/build/budgets.json');

const toKb = (bytes) => bytes / 1024;
const formatKb = (bytes) => `${toKb(bytes).toFixed(1)} KB`;

const readJson = async (filePath) => {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
};

const gzipSize = (buffer) => zlib.gzipSync(buffer).length;

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
    const preloadMatches = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)];
    const styleMatches = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)];
    const scriptSrcs = scriptMatches.map((match) => match[1]);
    const preloadSrcs = preloadMatches.map((match) => match[1]);
    const styleHrefs = styleMatches.map((match) => match[1]);

    const resolveAsset = (assetPath) => {
        const cleaned = assetPath.replace(/^\.\//, '').replace(/^\//, '');
        return path.join(distRoot, cleaned);
    };

    return {
        scripts: [...scriptSrcs, ...preloadSrcs].map(resolveAsset),
        styles: styleHrefs.map(resolveAsset),
    };
};

const summarizeAssets = async (files) => {
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
    return { totals, details };
};

const enforceBudgets = (totals, initial, budgets) => {
    const failures = [];

    const check = (label, actualBytes, budgetKb) => {
        if (!Number.isFinite(budgetKb)) return;
        if (toKb(actualBytes) > budgetKb) {
            failures.push(`${label}: ${formatKb(actualBytes)} > ${budgetKb.toFixed(1)} KB`);
        }
    };

    check('Initial JS (gzip)', initial.js.gzip, budgets.initialJsKb);
    check('Total JS (gzip)', totals.js.gzip, budgets.totalJsKb);
    check('Total CSS (gzip)', totals.css.gzip, budgets.totalCssKb);
    check('Total WASM (gzip)', totals.wasm.gzip, budgets.totalWasmKb);

    return failures;
};

const main = async () => {
    const distRoot = path.resolve(distDir);
    try {
        await fs.access(distRoot);
    } catch {
        console.error(`[budgets] Dist folder not found: ${distRoot}`);
        process.exit(1);
    }

    const budgetsFile = await readJson(budgetsPath).catch(() => null);
    const budgets = budgetsFile?.gzip || {};

    const files = await walk(distRoot);
    const { totals, details } = await summarizeAssets(files);
    const initialAssets = await parseInitialAssets(distRoot);

    const initialSizes = {
        js: { raw: 0, gzip: 0 },
        css: { raw: 0, gzip: 0 },
    };

    for (const script of initialAssets.scripts) {
        try {
            const sizes = await readAssetBytes(script);
            initialSizes.js.raw += sizes.raw;
            initialSizes.js.gzip += sizes.gzip;
        } catch {
            console.warn(`[budgets] Missing script: ${script}`);
        }
    }

    for (const style of initialAssets.styles) {
        try {
            const sizes = await readAssetBytes(style);
            initialSizes.css.raw += sizes.raw;
            initialSizes.css.gzip += sizes.gzip;
        } catch {
            console.warn(`[budgets] Missing stylesheet: ${style}`);
        }
    }

    console.log('\nBuild Budget Summary (gzip)');
    console.log(`Initial JS: ${formatKb(initialSizes.js.gzip)}`);
    console.log(`Total JS:   ${formatKb(totals.js.gzip)}`);
    console.log(`Total CSS:  ${formatKb(totals.css.gzip)}`);
    console.log(`Total WASM: ${formatKb(totals.wasm.gzip)}`);

    console.log('\nLargest Assets (gzip)');
    details.slice(0, 8).forEach((asset) => {
        const rel = path.relative(distRoot, asset.file);
        console.log(`- ${rel} (${formatKb(asset.gzip)})`);
    });

    const failures = enforceBudgets(totals, initialSizes, budgets);
    if (failures.length) {
        console.error('\nBudget failures:');
        failures.forEach((line) => console.error(`- ${line}`));
        process.exit(1);
    }

    console.log('\nBudgets OK');
};

main();
