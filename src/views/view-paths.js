// src/views/view-paths.js

const STATIC_ROUTE_META = {
    'view-home': { persona: 'child', primaryTask: true, navGroup: 'practice' },
    'view-onboarding': { persona: 'child', primaryTask: true, navGroup: 'practice' },
    'view-coach': { persona: 'child', primaryTask: true, navGroup: 'practice' },
    'view-trainer': { persona: 'child', primaryTask: false, navGroup: 'practice' },
    'view-tuner': { persona: 'child', primaryTask: false, navGroup: 'practice' },
    'view-bowing': { persona: 'child', primaryTask: false, navGroup: 'practice' },
    'view-posture': { persona: 'child', primaryTask: false, navGroup: 'practice' },
    'view-games': { persona: 'child', primaryTask: true, navGroup: 'games' },
    'view-songs': { persona: 'child', primaryTask: true, navGroup: 'songs' },
    'view-progress': { persona: 'child', primaryTask: true, navGroup: 'practice' },
    'view-analysis': { persona: 'child', primaryTask: false, navGroup: 'practice' },
    'view-help': { persona: 'child', primaryTask: false, navGroup: 'utility' },
    'view-about': { persona: 'child', primaryTask: false, navGroup: 'utility' },
    'view-backup': { persona: 'child', primaryTask: false, navGroup: 'utility' },
    'view-settings': { persona: 'child', primaryTask: false, navGroup: 'utility' },
    'view-parent': { persona: 'parent', primaryTask: false, navGroup: 'parent' },
};

const CHILD_DEFAULT_META = { persona: 'child', primaryTask: false, navGroup: 'utility' };

export const getRouteMeta = (viewId) => {
    if (!viewId || !viewId.startsWith('view-')) return CHILD_DEFAULT_META;
    if (viewId.startsWith('view-song-')) {
        return { persona: 'child', primaryTask: false, navGroup: 'songs' };
    }
    if (viewId.startsWith('view-game-')) {
        return { persona: 'child', primaryTask: false, navGroup: 'games' };
    }
    return STATIC_ROUTE_META[viewId] || CHILD_DEFAULT_META;
};

export function getViewPath(viewId) {
    if (!viewId.startsWith('view-')) {
        throw new Error(`Invalid view ID: ${viewId}`);
    }

    const name = viewId.replace('view-', '');

    if (name.startsWith('song-')) {
        return `views/songs/${name.replace('song-', '')}.html`;
    }

    if (name.startsWith('game-')) {
        return `views/games/${name.replace('game-', '')}.html`;
    }

    return `views/${name}.html`;
}
