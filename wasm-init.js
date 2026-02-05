const params = new URL(import.meta.url).searchParams;
const jsPath = params.get('js') || '/emerson-violin-pwa.js';
const wasmPath = params.get('wasm') || '/emerson-violin-pwa_bg.wasm';

const bindings = await import(jsPath);
const wasm = await bindings.default({ module_or_path: wasmPath });
window.wasmBindings = bindings;
dispatchEvent(new CustomEvent('TrunkApplicationStarted', { detail: { wasm } }));
