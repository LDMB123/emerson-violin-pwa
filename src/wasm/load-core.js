let wasmModule = null;
/**
 * Loads and caches the shared WASM core module on first use.
 */
export const getCore = async () => {
    if (!wasmModule) {
        const mod = await import('./panda_core.js');
        await mod.default();
        wasmModule = mod;
    }
    return wasmModule;
};
