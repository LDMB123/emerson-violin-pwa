import fs from 'fs';
import path from 'path';

const stylesDir = 'src/styles';
const cssFiles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css')).map(f => path.join(stylesDir, f));

const declaredVars = new Set();
const varDeclRegex = /--[a-zA-Z0-9_-]+(?=\s*:)/g;

cssFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = varDeclRegex.exec(content)) !== null) {
    declaredVars.add(match[0]);
  }
});

console.log(`Found ${declaredVars.size} unique CSS variables declared.`);

const usedVars = new Set();
// A variable is "used" if it appears inside var(...)
const varUseRegex = /var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,.*)?\)/g;

cssFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = varUseRegex.exec(content)) !== null) {
    usedVars.add(match[1]);
  }
});

const jsFiles = [];
function getFiles(dir, ext) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, ext);
    } else if (filePath.endsWith(ext)) {
      jsFiles.push(filePath);
    }
  });
}
getFiles('src', '.js');
getFiles('src', '.html');
getFiles('public', '.js');
getFiles('public', '.html');

// Some JS or inline styles might use them via CSSStyleDeclaration.setProperty or similar JS methods
jsFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  declaredVars.forEach(v => {
    if (content.includes(v)) {
      usedVars.add(v);
    }
  });
});

const orphanedVars = [...declaredVars].filter(v => !usedVars.has(v));

console.log(`\nFound ${orphanedVars.length} completely ORPHANED CSS Variables (Declared but never used in var() or JS):`);
console.log(orphanedVars.join('\n'));
