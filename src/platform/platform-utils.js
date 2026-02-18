/**
 * Pure utility functions for platform/PWA features
 * Extracted from native-apis.js for testability
 */

/**
 * Determines if persistent storage request should be retried
 * @param {Object|null|undefined} state - Previous persist request state
 * @param {boolean} state.persisted - Whether storage was successfully persisted
 * @param {number} state.lastAttempt - Timestamp of last attempt
 * @returns {boolean} True if retry should be attempted
 */
export const shouldRetryPersist = (state) => {
    if (!state) return true;
    if (state.persisted) return false;
    if (!state.lastAttempt) return true;
    const week = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - state.lastAttempt > week;
};

/**
 * Formats bytes into human-readable units (B, KB, MB, GB)
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string with appropriate unit
 */
export const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes)) return '0 MB';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    const precision = value < 10 && index > 0 ? 1 : 0;
    return `${value.toFixed(precision)} ${units[index]}`;
};

/**
 * Checks if the device is running iPadOS
 * @returns {boolean} True if running on iPadOS
 */
export const isIPadOS = () => /iPad/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Checks if app is running in standalone/installed mode
 * @returns {boolean} True if running as installed PWA
 */
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || window.navigator.standalone === true;

/**
 * Sets or removes a key on document.documentElement.dataset
 * @param {string} key - Dataset key
 * @param {string|number|null|undefined} value - Value to set; null/undefined removes the key
 */
export const setRootDataset = (key, value) => {
    const root = document.documentElement;
    if (!root) return;
    if (value === null || value === undefined) {
        delete root.dataset[key];
    } else {
        root.dataset[key] = String(value);
    }
};

/**
 * Gets current view ID from URL hash
 * @returns {string} View ID (e.g., "view-tuner") or "view-home" if no hash
 */
export const getViewId = () => {
    const hash = window.location.hash.replace('#', '').trim();
    return hash || 'view-home';
};

/**
 * Determines if a view allows wake lock
 * @param {string} viewId - View identifier
 * @returns {boolean} True if wake lock is allowed for this view
 */
export const viewAllowsWake = (viewId) => {
    if (viewId.startsWith('view-game-')) return true;
    if (viewId.startsWith('view-song-')) return true;
    return ['view-coach', 'view-songs', 'view-trainer', 'view-tuner', 'view-session-review'].includes(viewId);
};

/**
 * Gets the preferred screen orientation
 * @returns {string} Orientation type (e.g., "portrait-primary", "landscape-primary")
 */
export const getPreferredOrientation = () => {
    const current = screen.orientation?.type;
    if (current) return current;
    const landscape = window.matchMedia('(orientation: landscape)').matches;
    return landscape ? 'landscape-primary' : 'portrait-primary';
};
