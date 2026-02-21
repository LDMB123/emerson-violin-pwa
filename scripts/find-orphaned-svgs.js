import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const svgDir = 'public/assets';
const svgs = [];

function getSvgs(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getSvgs(filePath);
    } else if (filePath.endsWith('.svg')) {
      svgs.push(filePath);
    }
  });
}

getSvgs(svgDir);

console.log(`Auditing ${svgs.length} SVG assets...`);

const orphanedSvgs = [];

for (const svgPath of svgs) {
  const basename = path.basename(svgPath);
  try {
    const output = execSync(`grep -r -l "${basename}" src/ public/ index.html`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const matches = output.trim().split('\n').filter(Boolean);
    
    // We expect at least one match because grep also scans the public/assets dir itself
    // Or if the file doesn't match itself because grep ignores binary/SVG sometimes depending on config
    const isMatchedElsewhere = matches.some(m => path.resolve(m) !== path.resolve(svgPath));
    
    if (!isMatchedElsewhere) {
      orphanedSvgs.push(svgPath);
    }
  } catch(e) {
    // 0 matches
    orphanedSvgs.push(svgPath);
  }
}

console.log(`\nFound ${orphanedSvgs.length} completely ORPHANED SVG files:`);
console.log(orphanedSvgs.join('\n'));
