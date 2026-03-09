import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const indexPath = path.join(distDir, 'index.html');
const fallbackPath = path.join(distDir, '404.html');

if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing build entrypoint: ${indexPath}`);
}

fs.copyFileSync(indexPath, fallbackPath);
console.log('[spa-fallback] Wrote dist/404.html');
