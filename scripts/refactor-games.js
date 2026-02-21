import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '../public/views/games');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'note-memory.html');

for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    // 1. Remove the outer duplicated game-header. Matches <div class="game-header"> up to its closing </div>, followed by <div class="game-content"
    content = content.replace(/<div class="game-header">[\s\S]*?<\/div>(\s*)<div class="game-content"/, '<div class="game-content"');

    // 2. Add inline styles to game-content
    content = content.replace(/<div class="game-content"([^>]*)>/, (match, attrs) => {
        if (!attrs.includes('style=')) {
            return `<div class="game-content"${attrs} style="position: absolute; inset: 0; display: flex; flex-direction: column; overflow: hidden; pointer-events: none;">`;
        }
        return match;
    });

    // 3. Add inline styles to canvas and handle any wrapper
    content = content.replace(/<canvas([^>]*)><\/canvas>/, (match, attrs) => {
        if (!attrs.includes('style=')) {
            return `<canvas${attrs} style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: auto;"></canvas>`;
        }
        return match;
    });

    // 4. Wrap the inner game-header and mascot in the new top-layer HUD flex container
    // Let's use a very specific replace that captures the header and picture.
    const headerPattern = /(?:<!-- HUD Top Layer -->\s*)?<div class="game-header">([\s\S]*?)<\/div>\s*(?:<!-- Mascot Anchored -->\s*)?<picture>([\s\S]*?)<\/picture>/;
    content = content.replace(headerPattern,
        `<!-- Top layer HUD -->
    <div style="position: relative; z-index: 10; padding: var(--space-4); display: flex; justify-content: space-between; align-items: flex-start; pointer-events: auto;">
      <div class="game-header" style="flex: 1; margin: 0; background: none; box-shadow: none; padding: 0;">
$1</div>
      <picture>$2</picture>
    </div>`);

    // 5. Ensure the interaction panel has pointer-events: auto
    content = content.replace(/<div class="glass-panel"([^>]*)>/g, (match, attrs) => {
        if (attrs.includes('style="')) {
            if (!attrs.includes('pointer-events: auto')) {
                return `<div class="glass-panel"${attrs.replace('style="', 'style="pointer-events: auto; ')}>`;
            }
            return match;
        }
        return `<div class="glass-panel"${attrs} style="pointer-events: auto;">`;
    });

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Processed ${file}`);
}
