import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const distMode = args.has('--dist');

const outputs = distMode
  ? [path.join(rootDir, 'dist', 'sw-assets.js')]
  : [path.join(rootDir, 'public', 'sw-assets.js')];

const assets = new Set(['./']);

const toPosix = (value) => value.split(path.sep).join('/');

const walkDir = (dir, onFile) => {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, onFile);
      continue;
    }
    if (entry.isFile()) onFile(fullPath);
  }
};

const addDir = (sourceDir, options) => {
  const fullDir = path.join(rootDir, sourceDir);
  walkDir(fullDir, (filePath) => {
    const relative = toPosix(path.relative(fullDir, filePath));
    if (options.excludeDirs?.some((dir) => relative === dir || relative.startsWith(`${dir}/`))) return;
    if (options.exclude?.some((pattern) => pattern.test(relative))) return;
    if (options.include && !options.include.test(relative)) return;
    const urlPath = toPosix(path.posix.join(options.urlPrefix, relative));
    assets.add(urlPath.startsWith('./') ? urlPath : `./${urlPath}`);
  });
};

if (distMode) {
  addDir('dist', {
    urlPrefix: '',
    include: /\.(?:html|js|css|json|webmanifest|woff2?|png|jpe?g|svg|webp|gif|wav|mp3|m4a|ogg|wasm)$/i,
  });
} else {
  assets.add('./index.html');
  assets.add('./manifest.webmanifest');
  assets.add('./pwa-manifest.json');
  if (fs.existsSync(path.join(rootDir, 'public', 'config.json'))) {
    assets.add('./config.json');
  }
  if (fs.existsSync(path.join(rootDir, 'public', 'offline.html'))) {
    assets.add('./offline.html');
  }
  if (fs.existsSync(path.join(rootDir, 'public', 'pose.js'))) {
    assets.add('./pose.js');
  }
  if (fs.existsSync(path.join(rootDir, 'public', 'pdf.js'))) {
    assets.add('./pdf.js');
  }

  // Trunk bundles JS/WASM into dist; avoid caching source JS.

  addDir('src/styles', {
    urlPrefix: 'src/styles',
    include: /\.(?:css)$/i,
  });

  addDir('src/assets', {
    urlPrefix: 'src/assets',
    include: /\.(?:woff2?|woff|ttf|otf|png|jpe?g|svg|webp|gif)$/i,
  });

  addDir('public/assets', {
    urlPrefix: 'assets',
    include: /\.(?:png|jpe?g|svg|webp|gif|woff2?|otf|ttf|pfb|wav|mp3|m4a|ogg|task|mjs|bcmap)$/i,
    excludeDirs: ['mockups'],
  });

  addDir('public/models', {
    urlPrefix: 'models',
    include: /\.(?:json)$/i,
  });

  addDir('public/docs', {
    urlPrefix: 'docs',
    include: /\.(?:md|json)$/i,
  });

  addDir('public/sqlite', {
    urlPrefix: 'sqlite',
    include: /\.(?:mjs|js|wasm)$/i,
  });

  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    addDir('dist', {
      urlPrefix: '',
      include: /\.(?:html|js|css|json|webmanifest|woff2?|png|jpe?g|svg|webp|gif|wav|mp3|m4a|ogg|wasm)$/i,
    });
  }
}

const sortedAssets = Array.from(assets).sort();
const output = `self.__ASSETS__ = ${JSON.stringify(sortedAssets, null, 2)};\n`;

for (const target of outputs) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

const resolveLocalPath = (asset) => {
  if (!asset || asset === './') return null;
  const trimmed = asset.startsWith('./') ? asset.slice(2) : asset;
  if (distMode) {
    return path.join(rootDir, 'dist', trimmed);
  }
  if (trimmed.startsWith('src/styles/')) {
    return path.join(rootDir, trimmed);
  }
  if (trimmed.startsWith('assets/')) {
    return path.join(rootDir, 'public', trimmed);
  }
  if (trimmed.startsWith('docs/')) {
    return path.join(rootDir, 'public', trimmed);
  }
  const direct = path.join(rootDir, trimmed);
  if (fs.existsSync(direct)) return direct;
  const publicFallback = path.join(rootDir, 'public', trimmed);
  if (fs.existsSync(publicFallback)) return publicFallback;
  return direct;
};

const hashFile = (filePath) => {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
};

const manifestEntries = sortedAssets
  .map((asset) => {
    const localPath = resolveLocalPath(asset);
    if (!localPath || !fs.existsSync(localPath)) return null;
    return { path: asset, sha256: hashFile(localPath) };
  })
  .filter(Boolean);

const manifestOutput = {
  generatedAt: new Date().toISOString(),
  entries: manifestEntries,
};

const manifestTarget = distMode
  ? path.join(rootDir, 'dist', 'pwa-manifest.json')
  : path.join(rootDir, 'public', 'pwa-manifest.json');

fs.mkdirSync(path.dirname(manifestTarget), { recursive: true });
fs.writeFileSync(manifestTarget, JSON.stringify(manifestOutput, null, 2), 'utf8');

console.log(`[sw-assets] Wrote ${sortedAssets.length} entries`);
