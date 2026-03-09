import { loadWithRetries } from '../app/import-retry.js';

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
        wasmModulePromise = loadWithRetries({
            loader: async () => {
                console.log('[DEBUG] getCore(): STARTING IMPORT of panda_core.js');
                const mod = await import('./panda_core.js');
                console.log('[DEBUG] getCore(): IMPORT RESOLVED. STARTING mod.default() compilation');
                await mod.default();
                console.log('[DEBUG] getCore(): mod.default() RESOLVED. WASM MOUNTED.');
                return mod;
            },
        })
            .then((mod) => {
                wasmModule = mod;
                return mod;
            })
            .catch((error) => {
                console.error('[DEBUG] getCore(): IMPORT FAILED', error);
                wasmModulePromise = null;
                throw error;
            });
    }

    return wasmModulePromise;
};
