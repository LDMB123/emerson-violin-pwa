import * as cheerio from 'cheerio';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const indexPath = path.join(repoRoot, 'index.html');
const routeHomePath = path.join(repoRoot, 'public', 'views', 'home.html');

export const extractInlineHomeView = (indexHtml) => {
    const $ = cheerio.load(indexHtml);
    const homeView = $('section.view#view-home').first();
    if (!homeView.length) {
        throw new Error('Inline view-home section not found in index.html');
    }
    return $.html(homeView);
};

export const normalizeViewMarkup = (markup) => {
    const $ = cheerio.load(markup, null, false);
    return $.html()
        .replace(/\r\n/g, '\n')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

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
