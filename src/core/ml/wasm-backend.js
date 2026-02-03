const WASM_CACHE = 'panda-violin-wasm-v1';
const WASM_MODULES = [
    { name: 'audio', url: new URL('../wasm/panda_audio_bg.wasm', import.meta.url) },
    { name: 'core', url: new URL('../wasm/panda_core_bg.wasm', import.meta.url) },
];

let warmPromise = null;
const compiledModules = new Map();

export const isWasmAvailable = () => typeof WebAssembly !== 'undefined';

const cacheWasmResponse = async (url, response) => {
    if (!('caches' in window)) return;
    try {
        const cache = await caches.open(WASM_CACHE);
        await cache.put(url, response);
    } catch {
        // Ignore cache failures
    }
};

const compileWasm = async ({ name, url }) => {
    if (compiledModules.has(url.href)) return compiledModules.get(url.href);
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) return null;
    const responseClone = response.clone();
    const buffer = await response.arrayBuffer();
    let module = null;
    try {
        if (WebAssembly.compile) {
            module = await WebAssembly.compile(buffer);
        } else {
            const result = await WebAssembly.instantiate(buffer);
            module = result.module || result;
        }
    } catch {
        module = null;
    }
    compiledModules.set(url.href, module);
    cacheWasmResponse(url, responseClone);
    return module;
};

export const warmWasmModules = async () => {
    if (!isWasmAvailable()) return false;
    if (warmPromise) return warmPromise;
    warmPromise = (async () => {
        await Promise.allSettled(WASM_MODULES.map((entry) => compileWasm(entry)));
        return true;
    })();
    return warmPromise;
};

export const runWasmInference = async (features) => {
    const input = features instanceof Float32Array ? features : new Float32Array(features || []);
    await warmWasmModules();
    return input;
};
