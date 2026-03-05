const isLocalHost = (windowLike = globalThis.window) => {
    const hostname = windowLike?.location?.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
};

/** Returns whether localhost E2E realtime hooks are enabled. */
export const hasE2ERealtimeHooks = (windowLike = globalThis.window) =>
    isLocalHost(windowLike) &&
    windowLike?.__PANDA_E2E_HOOKS__ === true;

/** Returns whether localhost E2E realtime start simulation is enabled. */
export const hasE2ERealtimeStartSimulation = (windowLike = globalThis.window) =>
    isLocalHost(windowLike) &&
    windowLike?.__PANDA_E2E_RT_SIMULATE_START__ === true;
