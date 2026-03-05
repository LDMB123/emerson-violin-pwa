const DEFAULT_BASE_COOLDOWN_MS = 1500;
const DEFAULT_MAX_COOLDOWN_MS = 20000;
const DEFAULT_RETRY_DELAY_MS = 80;
const DEFAULT_RETRIABLE_ATTEMPTS = 1;

const waitFor = (delayMs) => new Promise((resolve) => {
    globalThis.setTimeout(resolve, Math.max(0, Number(delayMs) || 0));
});

const isRetriableImportError = (error) => {
    if (!error) return false;
    if (error instanceof TypeError) return true;
    const message = String(error?.message || '').toLowerCase();
    return message.includes('module script') || message.includes('import');
};

const nextCooldownMs = (previousCooldownMs, baseCooldownMs, maxCooldownMs) => {
    if (!Number.isFinite(previousCooldownMs) || previousCooldownMs <= 0) {
        return baseCooldownMs;
    }
    return Math.min(maxCooldownMs, previousCooldownMs * 2);
};

/** Creates the lazy module loader with retry and backoff handling for view modules. */
export const createModuleLoader = ({
    moduleLoaders,
    warn = (...args) => console.warn(...args),
    now = () => Date.now(),
    wait = waitFor,
    baseCooldownMs = DEFAULT_BASE_COOLDOWN_MS,
    maxCooldownMs = DEFAULT_MAX_COOLDOWN_MS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    retriableAttempts = DEFAULT_RETRIABLE_ATTEMPTS,
} = {}) => {
    const inflightLoads = new Map();
    const loadedModules = new Map();
    const failedLoads = new Map();

    const loadWithRetries = async (loader) => {
        let attempt = 0;
        // Initial attempt + retriableAttempts retries
        while (attempt <= retriableAttempts) {
            try {
                return await loader();
            } catch (error) {
                if (!isRetriableImportError(error) || attempt >= retriableAttempts) {
                    throw error;
                }
                attempt += 1;
                await wait(retryDelayMs);
            }
        }
        return null;
    };

    const loadModule = (key) => {
        const loader = moduleLoaders?.[key];
        if (!loader) return Promise.resolve(null);
        if (loadedModules.has(key)) return Promise.resolve(loadedModules.get(key));
        if (inflightLoads.has(key)) return inflightLoads.get(key);

        const failure = failedLoads.get(key);
        const timestamp = now();
        const withinCooldown = failure && (timestamp - failure.lastFailureAt) < failure.cooldownMs;
        if (withinCooldown) {
            return Promise.resolve(null);
        }

        const pendingLoad = loadWithRetries(loader)
            .then((module) => {
                failedLoads.delete(key);
                loadedModules.set(key, module);
                return module;
            })
            .catch((error) => {
                const previousCooldownMs = failure?.cooldownMs;
                const cooldownMs = nextCooldownMs(previousCooldownMs, baseCooldownMs, maxCooldownMs);
                const attempts = (failure?.attempts || 0) + 1;
                failedLoads.set(key, {
                    attempts,
                    cooldownMs,
                    lastFailureAt: now(),
                });
                warn(`[App] Failed to load ${key} (attempt ${attempts}; cooldown ${cooldownMs}ms)`, error);
                return null;
            })
            .finally(() => {
                inflightLoads.delete(key);
            });

        inflightLoads.set(key, pendingLoad);
        return pendingLoad;
    };

    return {
        loadModule,
        _debug: {
            inflightLoads,
            loadedModules,
            failedLoads,
        },
    };
};
