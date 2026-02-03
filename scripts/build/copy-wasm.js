import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve('src/core/wasm');
const crates = [
    { name: 'panda-core', files: ['panda_core.js', 'panda_core_bg.wasm', 'panda_core.d.ts'] },
    { name: 'panda-audio', files: ['panda_audio.js', 'panda_audio_bg.wasm', 'panda_audio.d.ts'] },
];

mkdirSync(outDir, { recursive: true });

let copied = 0;
crates.forEach((crate) => {
    const pkgDir = resolve('wasm-src', crate.name, 'pkg');
    crate.files.forEach((file) => {
        const src = resolve(pkgDir, file);
        const dest = resolve(outDir, file);
        if (!existsSync(src)) {
            return;
        }
        copyFileSync(src, dest);
        copied += 1;
    });
});

if (!copied) {
    console.error('[wasm] No wasm artifacts found to copy. Run `npm run wasm:build` first.');
    process.exit(1);
}

console.log(`[wasm] Copied ${copied} wasm artifacts into src/core/wasm.`);
