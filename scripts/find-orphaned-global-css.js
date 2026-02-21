import fs from 'fs';
import { execSync } from 'child_process';

const content = fs.readFileSync('src/styles/app.css', 'utf8');
const classRegex = /\.([a-zA-Z0-9_-]+)(?=[^a-zA-Z0-9_-])/g;
const classes = new Set();
let match;
while ((match = classRegex.exec(content)) !== null) {
  classes.add(match[1]);
}

const ignoreList = [
    'active', 'visible', 'hidden', 'error', 'success', 'playing', 'paused',
    'animating', 'celebrating', 'flash', 'is-visible', 'is-running', 
    'is-leaving', 'filled', 'revealed', 'empty', 'is-selected', 'glow', 'in-tune',
    // E2E Test specific
    'test-target'
];

const filtered = Array.from(classes).filter(c => !ignoreList.includes(c));
console.log(`Checking ${filtered.length} unique CSS classes from app.css...`);

const unused = [];

for (const cls of filtered) {
    try {
        // If grep returns 0, it means it found something, so it's USED.
        // We only search JS and HTML files. We escape the search term.
        execSync(`grep -rE "['\\\" .]${cls}['\\\" .>:-]" src/ public/views/ public/index.html tests/`, { stdio: 'ignore' });
    } catch (e) {
        // grep returns 1, meaning NOT found, UNUSED
        unused.push(cls);
    }
}

console.log(`\nFound ${unused.length} potentially UNUSED global CSS classes:`);
console.log(unused.join('\n'));
