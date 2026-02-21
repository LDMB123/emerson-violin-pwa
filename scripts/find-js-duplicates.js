import fs from 'fs';
import path from 'path';

const srcDir = 'src';
const jsFiles = [];

function getFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (!filePath.includes('wasm') && !filePath.includes('vendor')) {
            if (fs.statSync(filePath).isDirectory()) {
                getFiles(filePath);
            } else if (filePath.endsWith('.js')) {
                jsFiles.push(filePath);
            }
        }
    });
}
getFiles(srcDir);

console.log(`Scanning ${jsFiles.length} JS files for duplicated logic chunks...`);

// To find duplicate chunks, we will normalize the text (remove brackets, semi-colons, whitespace)
// then break it into N-gram chunks of words (e.g., 20 words long).
const N_GRAM_SIZE = 15; // words
const chunkMap = new Map();

for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');

    // Strip comments
    let clean = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    // Extract words
    const tokens = clean.match(/[a-zA-Z0-9_]+/g);
    if (!tokens) continue;

    for (let i = 0; i <= tokens.length - N_GRAM_SIZE; i++) {
        const chunk = tokens.slice(i, i + N_GRAM_SIZE).join(' ');
        if (chunkMap.has(chunk)) {
            chunkMap.get(chunk).push(file);
        } else {
            chunkMap.set(chunk, [file]);
        }
    }
}

const duplicates = new Map();

for (const [chunk, filesArr] of chunkMap.entries()) {
    // We only care if the chunk appears in more than 1 DISTINCT file
    const uniqueFiles = new Set(filesArr);
    if (uniqueFiles.size > 1) {
        // Filter out common import/export boilerplate chunks
        if (!chunk.includes('export') && !chunk.includes('import') && !chunk.includes('const MODULE_LOADERS')) {
            duplicates.set(chunk, Array.from(uniqueFiles));
        }
    }
}

// Find the longest possible duplicate chunks by extending the matches.
// This naive approach gives us the fundamental duplicates.
const results = Array.from(duplicates.entries());
console.log(`Found ${results.length} distinct logic chunks (${N_GRAM_SIZE} tokens long) pasted across multiple files.`);

// Print out a few examples of the most duplicated logic:
if (results.length > 0) {
    // Sort by number of files sharing this block
    results.sort((a, b) => b[1].length - a[1].length);
    console.log("\nTop Duplications:");
    for (let i = 0; i < Math.min(10, results.length); i++) {
        console.log(`\nFiles: ${results[i][1].join(', ')}`);
        console.log(`Snippet: ...${results[i][0]}...`);
    }
}
