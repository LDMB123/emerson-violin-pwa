import fs from 'fs';
import path from 'path';

const srcDir = 'src';
const jsFiles = [];

function getFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
        getFiles(filePath);
    } else if (filePath.endsWith('.js')) {
        jsFiles.push(filePath);
    }
  });
}

getFiles(srcDir);

// 1. Collect all "exported" functions or constants that look like functions
// 2. Read all files to see if they are invoked
// Unlike `knip`, we'll check if they are invoked anywhere *including* their own file,
// but we'll flag ones that are *only* invoked in their own file if they are exported,
// OR functions inside classes that are never called.

console.log(`Analyzing ${jsFiles.length} files for internal helper usage...`);

// To do a true AST pass without external deps is hard in raw Node, so we'll do a highly aggressive RegExp pass first.
// Let's look for `function something()` or `const something = () =>` that is NOT exported.
// If it's not exported, and it's not called in the file, it's dead.

const deadLocalFunctions = [];

for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Match `function foo(`
    const fnRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
    let match;
    const fns = new Set();
    while ((match = fnRegex.exec(content)) !== null) {
        fns.add(match[1]);
    }

    // Match `const foo = (` or `const foo = function` or `let foo = ()`
    const arrowRegex = /(?:const|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:\([^)]*\)\s*=>|function\s*\(|async\s*\()/g;
    while ((match = arrowRegex.exec(content)) !== null) {
        fns.add(match[1]);
    }
    
    // Check if they are exported natively `export const foo` or `export function foo`
    const exports = new Set();
    const exportRegex = /export\s+(?:const|let|var|function|async\s+function)\s+([a-zA-Z0-9_]+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
        exports.add(match[1]);
    }

    const exportedDefault = /export\s+default\s+([a-zA-Z0-9_]+)/.exec(content);
    if (exportedDefault) {
        exports.add(exportedDefault[1]);
    }

    // Unexported functions:
    const localFns = [...fns].filter(f => !exports.has(f));

    for (const lf of localFns) {
        // Does 'lf' appear anywhere else in the file?
        // We look for 'lf(' or 'lf,' or 'lf;' or 'lf ' (used as callback)
        // But NOT its definition line.
        
        // Count total occurrences
        const usageRegex = new RegExp(`\\b${lf}\\b`, 'g');
        const count = (content.match(usageRegex) || []).length;
        
        // If it only occurs once (in its own definition), it's dead.
        if (count === 1) {
            deadLocalFunctions.push(`${lf} in ${file}`);
        }
    }
}

console.log(`\nFound ${deadLocalFunctions.length} completely dead (unexported) local functions/constants:`);
console.log(deadLocalFunctions.join('\n'));
