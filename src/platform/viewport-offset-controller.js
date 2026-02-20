export const createViewportOffsetController = ({ rootStyle = document.documentElement.style } = {}) => {
    let visualViewportGlobalsBound = false;

    const update = () => {
        if (!rootStyle) return;
        const viewport = window.visualViewport;
        if (!viewport) {
            rootStyle.setProperty('--keyboard-offset', '0px');
            return;
        }
        const rawOffset = window.innerHeight - viewport.height - viewport.offsetTop;
        const offset = Math.max(0, Math.round(rawOffset));
        rootStyle.setProperty('--keyboard-offset', `${offset}px`);
    };

    const bind = () => {
        if (!window.visualViewport) {
            update();
            return;
        }
        update();
        if (visualViewportGlobalsBound) return;
        visualViewportGlobalsBound = true;
        window.visualViewport.addEventListener('resize', update);
        window.visualViewport.addEventListener('scroll', update);
        window.addEventListener('orientationchange', update, { passive: true });
    };

    return {
        bind,
        update,
    };
};
