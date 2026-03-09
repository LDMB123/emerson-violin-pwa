
/**
 * Normalizes a location hash into a view id.
 *
 * @param {string | null | undefined} hash
 * @returns {string}
 */
export const getViewId = (hash) => {
    const id = (hash || '').replace('#', '').trim();
    return id || 'view-home';
};


/**
 * Checks whether a nav item matches the active nav target.
 *
 * @param {string | null | undefined} itemHref
 * @param {string | null | undefined} activeHref
 * @returns {boolean}
 */
export const isNavItemActive = (itemHref, activeHref) => {
    if (!activeHref) return false;
    return itemHref === activeHref;
};

