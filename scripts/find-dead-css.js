import fs from 'fs';
import { execSync } from 'child_process';

function extractClasses(cssFile) {
    const content = fs.readFileSync(cssFile, 'utf8');
    // Simple regex to grab anything starting with a dot followed by valid class characters
    const classRegex = /\.([a-zA-Z0-9_-]+)/g;
    const classes = new Set();
    let match;
    while ((match = classRegex.exec(content)) !== null) {
        classes.add(match[1]);
    }
    return Array.from(classes);
}

// 1. Extract from CSS
const appCssClasses = extractClasses('src/styles/app.css');
const gamesCssClasses = extractClasses('src/styles/games.css');

const allClasses = [...new Set([...appCssClasses, ...gamesCssClasses])];

console.log(`Checking ${allClasses.length} distinct CSS classes...`);

// 2. Filter out some known dynamic or generic false positives
const ignoreList = [
    'active', 'visible', 'hidden', 'error', 'success', 'playing', 'paused',
    'in-tune', 'glow', 'animating', 'celebrating', 'flash'
];

const filteredClasses = allClasses.filter(c => !ignoreList.includes(c));
const unused = [];

// 3. Search for each class in the src/ and public/ directories
for (const cls of filteredClasses) {
    try {
        // If grep returns 0, it means it found something, so it's USED.
        // We suppress stdout and stderr to keep the console clean.
        execSync(`grep -rE "['\\" .]${cls}['\\" .>:-]" src/ public/views/ public/index.html`, { stdio: 'ignore' });
    } catch (e) {
        // If grep returns 1, it means not found, so UNUSED.
        unused.push(cls);
    }
}

console.log(`\nFound ${unused.length} potentially unused classes:`);
console.log(unused.join('\n'));
