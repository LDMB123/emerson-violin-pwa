import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outputs = [
    path.join(rootDir, 'sw-assets.js'),
    path.join(rootDir, 'public', 'sw-assets.js'),
];

const assets = new Set([
    './',
    './index.html',
    './manifest.webmanifest',
]);

const toPosix = (value) => value.split(path.sep).join('/');

const walkDir = (dir, onFile) => {
    if (!fs.existsSync(dir)) {
        return;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath, onFile);
            continue;
        }
        if (entry.isFile()) {
            onFile(fullPath);
        }
    }
};

const addDir = (sourceDir, options) => {
    const fullDir = path.join(rootDir, sourceDir);
    walkDir(fullDir, (filePath) => {
        const relative = toPosix(path.relative(fullDir, filePath));
        if (options.excludeDirs?.some((dir) => relative === dir || relative.startsWith(`${dir}/`))) {
            return;
        }
        if (options.exclude?.some((pattern) => pattern.test(relative))) {
            return;
        }
        if (options.include && !options.include.test(relative)) {
            return;
        }
        const urlPath = toPosix(path.posix.join(options.urlPrefix, relative));
        assets.add(urlPath.startsWith('./') ? urlPath : `./${urlPath}`);
    });
};

addDir('src', {
    urlPrefix: 'src',
    include: /\.(?:js|css|wasm|woff2|json)$/i,
    exclude: [
        /\.test\.js$/i,
        /\.spec\.js$/i,
        /^modules\/songs\.js$/i,
        /^modules\/storage\.js$/i,
        /^data\/songs\.json$/i,
        /^ml\//i,
        /^db\.js$/i,
    ],
});

addDir('public/assets', {
    urlPrefix: 'assets',
    include: /\.(?:png|jpe?g|svg|webp|gif|mp3|wav)$/i,
    excludeDirs: ['mockups'],
});

const sortedAssets = Array.from(assets).sort();
const output = `self.__ASSETS__ = ${JSON.stringify(sortedAssets, null, 2)};\n`;

for (const target of outputs) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, output, 'utf8');
}

console.log(`[sw-assets] Wrote ${sortedAssets.length} entries`);
