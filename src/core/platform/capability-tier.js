const getConnection = () => navigator.connection || navigator.mozConnection || navigator.webkitConnection;

export const getCapabilityProfile = () => {
    const connection = getConnection();
    const saveData = Boolean(connection?.saveData);
    const deviceMemory = Number.isFinite(navigator.deviceMemory) ? navigator.deviceMemory : null;
    const hardwareConcurrency = Number.isFinite(navigator.hardwareConcurrency)
        ? navigator.hardwareConcurrency
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
