let wasmModule = null;
export const getCore = async () => {
    if (!wasmModule) {
        const mod = await import('./panda_core.js');
        await mod.default();
        wasmModule = mod;
    }
    return wasmModule;
};
