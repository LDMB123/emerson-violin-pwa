import { GAME_PLAY_AGAIN } from '../utils/event-names.js';

const toViewId = (hashId) => String(hashId || '').replace(/^#/, '');

/** Binds shared reset and teardown handlers for a game view session. */
export const bindGameSessionLifecycle = ({
    hashId,
    onReset = null,
    onDeactivate = null,
    onReport = null,
} = {}) => {
    const expectedViewId = toViewId(hashId);
    const runDeactivateAndReport = () => {
        if (typeof onDeactivate === 'function') onDeactivate();
        if (typeof onReport === 'function') onReport();
    };

    const handleHashChange = () => {
        if (window.location.hash === hashId) {
            if (typeof onReset === 'function') onReset();
            return;
        }
        runDeactivateAndReport();
    };

    const handlePlayAgain = (event) => {
        const requestedViewId = event?.detail?.viewId;
        const currentViewId = window.location.hash.replace(/^#/, '');
        if (requestedViewId && requestedViewId !== expectedViewId) return;
        if (currentViewId !== expectedViewId) return;
        if (typeof onReset === 'function') onReset();
    };

    const handlePageHide = (event) => {
        const currentViewId = window.location.hash.replace(/^#/, '');
        if (currentViewId !== expectedViewId) return;
        if (event?.persisted) return;
        runDeactivateAndReport();
    };

    window.addEventListener('hashchange', handleHashChange, { passive: true });
    window.addEventListener('pagehide', handlePageHide, { passive: true });
    document.addEventListener(GAME_PLAY_AGAIN, handlePlayAgain);

    return () => {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('pagehide', handlePageHide);
        document.removeEventListener(GAME_PLAY_AGAIN, handlePlayAgain);
    };
};
