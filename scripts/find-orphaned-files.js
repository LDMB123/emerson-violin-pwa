import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get all files recursively
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

const allFiles = [...getAllFiles('public'), ...getAllFiles('src')];
const ignoreExts = ['.DS_Store', '.gitkeep'];

const filesToCheck = allFiles.filter(f => !ignoreExts.some(ext => f.endsWith(ext)));

console.log(`Checking ${filesToCheck.length} files for references...`);

const orphaned = [];

for (const file of filesToCheck) {
    const basename = path.basename(file);

    // We skip index.html, sw.js as entry points, and manifest configs
    if (['index.html', 'sw.js', 'manifest.json', 'site.webmanifest', 'favicon.ico', 'apple-touch-icon.png'].includes(basename)) {
        continue;
    }

    // Also skip the scripts/ and tests/ folders as we are only searching purely src and public

    try {
        // Search for the basename inside public/ src/ index.html, excluding the file itself
        // We use grep -r -l to get matching files.
        // If the only matching file is the file itself, it's orphaned.
        const output = execSync(`grep -r -l "${basename}" src/ public/ index.html`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const matchingFiles = output.trim().split('\n').filter(Boolean);

        // If it only matches itself, or doesn't match anything (rare if grep worked), it's orphaned
        if (matchingFiles.length === 0 || (matchingFiles.length === 1 && path.resolve(matchingFiles[0]) === path.resolve(file))) {
            orphaned.push(file);
        }
    } catch (e) {
        // grep returns 1 if not found
        orphaned.push(file);
    }
}

console.log(`Found ${orphaned.length} potentially orphaned files:`);
console.log(orphaned.join('\n'));
