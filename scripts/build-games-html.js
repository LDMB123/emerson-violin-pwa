/**
 * Build script: injects game view templates into index.html
 *
 * Reads all .html files from src/games/templates/ and replaces the
 * content between <!-- GAME_VIEWS_START --> and <!-- GAME_VIEWS_END -->
 * markers in index.html.
 *
 * Run as part of the prebuild chain:
 *   node scripts/build-games-html.js
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const INDEX = join(ROOT, 'index.html');
const TEMPLATES_DIR = join(ROOT, 'src', 'games', 'templates');

const START_MARKER = '<!-- GAME_VIEWS_START -->';
const END_MARKER = '<!-- GAME_VIEWS_END -->';

const html = readFileSync(INDEX, 'utf8');

const startIdx = html.indexOf(START_MARKER);
const endIdx = html.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
    console.log('[build-games-html] Markers not found, skipping.');
    process.exit(0);
}

const files = readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.html'))
    .sort();

const fragments = files.map((f) => readFileSync(join(TEMPLATES_DIR, f), 'utf8').trimEnd());
const combined = fragments.join('\n');

const before = html.slice(0, startIdx + START_MARKER.length);
const after = html.slice(endIdx);

const output = `${before}\n${combined}\n      ${after}`;
writeFileSync(INDEX, output, 'utf8');

console.log(`[build-games-html] Injected ${files.length} game templates into index.html`);
