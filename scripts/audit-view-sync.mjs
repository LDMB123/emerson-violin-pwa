import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findFirstElementById, normalizeMarkup } from './html-audit-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const indexPath = path.join(repoRoot, 'index.html');
const routeHomePath = path.join(repoRoot, 'public', 'views', 'home.html');

export const extractInlineHomeView = (indexHtml) => {
    const homeView = findFirstElementById(indexHtml, 'view-home');
    if (!homeView || homeView.tagName !== 'section') {
        throw new Error('Inline view-home section not found in index.html');
    }
    const classes = String(homeView.attrs.class || '').split(/\s+/).filter(Boolean);
    if (!classes.includes('view')) {
        throw new Error('Inline view-home section is missing class="view" in index.html');
    }
    return homeView.outerHtml;
};

export const normalizeViewMarkup = (markup) => normalizeMarkup(markup);

export const isHomeViewSynced = (inlineMarkup, routeMarkup) =>
    normalizeViewMarkup(inlineMarkup) === normalizeViewMarkup(routeMarkup);

const runAudit = () => {
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');
    const routeHomeHtml = fs.readFileSync(routeHomePath, 'utf-8');
    const inlineHomeHtml = extractInlineHomeView(indexHtml);

    if (!isHomeViewSynced(inlineHomeHtml, routeHomeHtml)) {
        console.error('Home view sync audit failed: index.html#view-home differs from public/views/home.html.');
        process.exitCode = 1;
        return;
    }

    console.log('Home view sync audit passed.');
};

if (import.meta.url === `file://${process.argv[1]}`) {
    runAudit();
}
