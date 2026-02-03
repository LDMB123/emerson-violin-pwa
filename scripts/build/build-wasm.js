import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = new Set(process.argv.slice(2));
const isDev = args.has('--dev');
const wasmPack = process.env.WASM_PACK || 'wasm-pack';

const crates = [
    { name: 'panda-core', outName: 'panda_core' },
    { name: 'panda-audio', outName: 'panda_audio' },
];

const checkWasmPack = () => {
    const result = spawnSync(wasmPack, ['--version'], { stdio: 'pipe' });
    return result.status === 0;
};

if (!checkWasmPack()) {
    console.error('[wasm] wasm-pack not found. Install it with: cargo install wasm-pack');
    process.exit(1);
}

const modeArgs = isDev ? ['--dev'] : ['--release'];

crates.forEach((crate) => {
    const cratePath = resolve('wasm-src', crate.name);
    console.log(`[wasm] Building ${crate.name} (${isDev ? 'dev' : 'release'})…`);
    const result = spawnSync(
        wasmPack,
        ['build', cratePath, '--target', 'web', '--out-name', crate.outName, ...modeArgs],
        { stdio: 'inherit' }
    );
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
});

console.log('[wasm] Build complete. Run `npm run wasm:copy` to refresh src/core/wasm outputs.');
