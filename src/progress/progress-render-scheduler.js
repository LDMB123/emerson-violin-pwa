export const createProgressRenderScheduler = (apply) => {
    let pendingData = null;
    let rafId = 0;

    return (data) => {
        pendingData = data;
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            if (pendingData) apply(pendingData);
        });
    };
};
