const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function extractClasses(cssFile) {
  const content = fs.readFileSync(cssFile, 'utf8');
  const classRegex = /\.([a-zA-Z0-9_-]+)/g;
  const classes = new Set();
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    classes.add(match[1]);
  }
  return Array.from(classes);
}

const appCssClasses = extractClasses('src/styles/app.css');
const gamesCssClasses = extractClasses('src/styles/games.css');
const allClasses = [...new Set([...appCssClasses, ...gamesCssClasses])];

console.log(`Checking ${allClasses.length} distinct CSS classes...`);

const unused = [];
for (const cls of allClasses) {
  try {
    // Search in src/ and public/views/
    execSync(`grep -r "${cls}" src/ public/views/ public/index.html`, { stdio: 'ignore' });
  } catch (e) {
    // grep returns non-zero if not found
    unused.push(cls);
  }
}

console.log(`\nFound ${unused.length} potentially unused classes:`);
console.log(unused.join('\n'));
