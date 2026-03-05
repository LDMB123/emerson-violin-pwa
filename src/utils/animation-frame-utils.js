export const cancelAnimationFrameId = (target, key = 'rafId') => {
    if (!target) return;
    const rafId = target[key];
    if (rafId === null || rafId === undefined) return;
    cancelAnimationFrame(rafId);
    target[key] = null;
};
