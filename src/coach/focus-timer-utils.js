/**
 * Determines whether the focus timer should be stopped.
 * @param {{
 *   isChecked: boolean,
 *   isCompleting: boolean,
 *   viewId: string,
 *   force?: boolean
 * }} options
 * @returns {boolean}
 */
export const shouldStopFocusTimer = ({ isChecked, isCompleting, viewId, force = false }) => {
    if (!isChecked || isCompleting) return false;
    return force || viewId !== '#view-coach';
};
