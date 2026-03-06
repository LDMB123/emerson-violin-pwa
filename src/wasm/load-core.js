let wasmModule = null;
let wasmModulePromise = null;
/**
 * Loads and caches the shared WASM core module on first use.
 */
export const getCore = async () => {
    if (wasmModule) {
        return wasmModule;
    }

    if (!wasmModulePromise) {
        wasmModulePromise = import('./panda_core.js')
            .then(async (mod) => {
                await mod.default();
                wasmModule = mod;
                return mod;
            })
            .catch((error) => {
                wasmModulePromise = null;
                throw error;
            });
    }

    return wasmModulePromise;
};
