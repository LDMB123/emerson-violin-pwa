const isLocalHost = (windowLike = globalThis.window) => {
    const hostname = windowLike?.location?.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
};

export const hasE2ERealtimeHooks = (windowLike = globalThis.window) =>
    isLocalHost(windowLike) &&
    windowLike?.__PANDA_E2E_HOOKS__ === true;

export const hasE2ERealtimeStartSimulation = (windowLike = globalThis.window) =>
    isLocalHost(windowLike) &&
    windowLike?.__PANDA_E2E_RT_SIMULATE_START__ === true;
