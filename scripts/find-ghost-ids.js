import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get all JS files
function getAllFiles(dirPath, ext, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, ext, arrayOfFiles);
    } else if (file.endsWith(ext)) {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });
  return arrayOfFiles;
}

const jsFiles = getAllFiles('src', '.js');

const idRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
const qsRegex = /querySelector\(['"]#([^'"]+)['"]\)/g;

const extractedIds = new Set();

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = idRegex.exec(content)) !== null) {
    extractedIds.add(match[1]);
  }
  while ((match = qsRegex.exec(content)) !== null) {
    extractedIds.add(match[1]);
  }
}

console.log(`Found ${extractedIds.size} unique HTML IDs queried in JavaScript.`);

const ghostIds = [];

for (const id of extractedIds) {
  try {
    execSync(`grep -rE "id=['\\"]${id}['\\"]" public/`, { stdio: 'ignore' });
  } catch (e) {
    ghostIds.push(id);
  }
}

console.log(`\nFound ${ghostIds.length} completely GHOST IDs (queried by JS, but missing from HTML):`);
console.log(ghostIds.join('\n'));
