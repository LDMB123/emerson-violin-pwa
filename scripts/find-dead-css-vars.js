const fs = require('fs');
const { execSync } = require('child_process');

function findDeadVars(cssFile) {
    const content = fs.readFileSync(cssFile, 'utf8');
    const varDeclRegex = /--[a-zA-Z0-9_-]+(?=\s*:)/g;
    const declarations = new Set();
    let match;
    while ((match = varDeclRegex.exec(content)) !== null) {
        declarations.add(match[0]);
    }
    
    // Ignore pure structural tokens that could be read by JS
    const ignoreList = ['--game-primary', '--game-secondary'];
    
    const unused = [];
    console.log(`Checking ${declarations.size} variables in ${cssFile}...`);
    
    for (const v of declarations) {
        if (ignoreList.includes(v)) continue;
        try {
            // we check if `var(${v})` or `var(${v},` or just `${v}` is used anywhere in src/ or public/
            execSync(`grep -rE "var\\\(${v}" src/ public/views/ public/index.html | grep -v "${cssFile}"`, { stdio: 'ignore' });
        } catch (e) {
            // if grep fails, it means no usage found outside of declaration
            unused.push(v);
        }
    }
    
    if (unused.length > 0) {
        console.log(`\nFound ${unused.length} potentially dead variables in ${cssFile}:`);
        console.log(unused.join('\n'));
    } else {
        console.log(`All variables in ${cssFile} appear to be used.`);
    }
}

findDeadVars('src/styles/app.css');
if (fs.existsSync('src/styles/games.css')) {
    findDeadVars('src/styles/games.css');
}
