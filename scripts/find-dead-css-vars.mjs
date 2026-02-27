import fs from 'fs';
import { execSync } from 'child_process';

function findDeadVars(cssFile) {
    const content = fs.readFileSync(cssFile, 'utf8');
    const varDeclRegex = /--[a-zA-Z0-9_-]+(?=\s*:)/g;
    const declarations = new Set();
    let match;
    while ((match = varDeclRegex.exec(content)) !== null) {
        declarations.add(match[0]);
    }

    // Ignore pure structural tokens that could be read by JS
    const ignoreList = ['--game-primary', '--game-secondary', '--ease-bounce', '--ease-spring'];

    const unused = [];
    console.log(`Checking ${declarations.size} variables originally defined in ${cssFile}...`);

    for (const v of declarations) {
        if (ignoreList.includes(v)) continue;
        try {
            // grep -rF
            const out = execSync(`grep -rF "var(${v}" src/ public/views/ index.html`, { encoding: 'utf8' });
            if (!out || !out.trim()) {
                unused.push(v);
            }
        } catch (e) {
            // Check if it's an actual error or just grep return code 1 (not found)
            if (e.status === 1) {
                unused.push(v);
            } else {
                console.error(`Error checking ${v}:`, e.message);
            }
        }
    }

    if (unused.length > 0) {
        console.log(`\nFound ${unused.length} completely dead variables from ${cssFile}:`);
        console.log(unused.join('\n'));
    } else {
        console.log(`All variables in ${cssFile} appear to be used.`);
    }
}

findDeadVars('src/styles/app.css');
if (fs.existsSync('src/styles/games.css')) {
    findDeadVars('src/styles/games.css');
}
