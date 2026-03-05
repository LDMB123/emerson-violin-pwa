export const createVisibilityListener = (handler) => {
    let isBound = false;

    const bind = () => {
        if (isBound || typeof handler !== 'function') return;
        document.addEventListener('visibilitychange', handler);
        isBound = true;
    };

    const unbind = () => {
        if (!isBound || typeof handler !== 'function') return;
        document.removeEventListener('visibilitychange', handler);
        isBound = false;
    };

    return {
        bind,
        unbind,
    };
};
