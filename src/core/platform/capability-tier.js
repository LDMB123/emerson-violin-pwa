const getNavigator = () => (typeof navigator !== 'undefined' ? navigator : {});
const getConnection = (nav) => nav.connection || nav.mozConnection || nav.webkitConnection;

export const getCapabilityProfile = () => {
    const nav = getNavigator();
    const connection = getConnection(nav);
    const saveData = Boolean(connection?.saveData);
    const deviceMemory = Number.isFinite(nav.deviceMemory) ? nav.deviceMemory : null;
    const hardwareConcurrency = Number.isFinite(nav.hardwareConcurrency)
        ? nav.hardwareConcurrency
        : null;

    let tier = 'low';
    if (!saveData) {
        if (deviceMemory !== null && hardwareConcurrency !== null) {
            tier = deviceMemory >= 4 && hardwareConcurrency >= 4 ? 'high' : (deviceMemory >= 4 || hardwareConcurrency >= 4 ? 'balanced' : 'low');
        } else if (deviceMemory !== null || hardwareConcurrency !== null) {
            const memReady = deviceMemory !== null && deviceMemory >= 4;
            const cpuReady = hardwareConcurrency !== null && hardwareConcurrency >= 4;
            tier = memReady || cpuReady ? 'balanced' : 'low';
        }
    }

    return {
        tier,
        deviceMemory,
        hardwareConcurrency,
        saveData,
    };
};

export const isTierAtLeast = (tier, target) => {
    const order = ['low', 'balanced', 'high'];
    const tierIndex = order.indexOf(tier);
    const targetIndex = order.indexOf(target);
    if (tierIndex === -1 || targetIndex === -1) return false;
    return tierIndex >= targetIndex;
};
