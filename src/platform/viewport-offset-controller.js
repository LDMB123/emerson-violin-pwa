import { positiveRound } from '../utils/math.js';

/**
 * Keeps the CSS keyboard offset variable in sync with the visual viewport.
 *
 * @param {Object} [options={}]
 * @param {CSSStyleDeclaration | null | undefined} [options.rootStyle=document.documentElement.style]
 * Style declaration that receives `--keyboard-offset`.
 * @returns {{
 *   bind: () => void,
 *   update: () => void
 * }}
 */
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
        const offset = positiveRound(rawOffset);
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
        window.visualViewport.addEventListener('resize', update, { passive: true });
        window.visualViewport.addEventListener('scroll', update, { passive: true });
        if (screen.orientation) {
            screen.orientation.addEventListener('change', update);
        } else {
            window.addEventListener('orientationchange', update, { passive: true });
        }
    };

    return {
        bind,
        update,
    };
};
