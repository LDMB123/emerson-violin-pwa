import fs from 'fs';
import path from 'path';

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
getFiles('src');

// Regex to capture import { A, B } from ...
const importDestructRegex = /import\s*\{\s*([^}]+)\s*\}\s*from/g;

const unusedImports = [];

for (const file of jsFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  
  // Create a copy of the content but wipe out all import statements so we don't match the import itself
  const bodyContent = content.replace(/import\s*\{[^}]+\}\s*from\s*['"][^'"]+['"];?/g, '');
  
  while ((match = importDestructRegex.exec(content)) !== null) {
    const importsStr = match[1];
    const importedVars = importsStr.split(',').map(s => {
      // Handle 'A as B'
      const parts = s.trim().split(/\s+as\s+/);
      return parts.length > 1 ? parts[1].trim() : parts[0].trim();
    }).filter(v => !!v);

    for (const v of importedVars) {
      // Regex to see if the variable is used. Needs word boundaries.
      // E.g. \bMyVar\b
      const usageRegex = new RegExp(`\\b${v}\\b`);
      if (!usageRegex.test(bodyContent)) {
         unusedImports.push(`${v} in ${file}`);
      }
    }
  }
}

console.log(`Audited ${jsFiles.length} JS files for unused destructured imports.`);
console.log(`Found ${unusedImports.length} perfectly imported, but silently unused variables:`);
console.log(unusedImports.join('\n'));
