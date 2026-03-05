export const getMainContentContainer = (scope = 'View') => {
    const container = document.getElementById('main-content');
    if (container) return container;
    console.error(`[${scope}] main-content container not found`);
    return null;
};
