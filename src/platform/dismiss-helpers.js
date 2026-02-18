/**
 * Shared dismiss helpers for install prompts.
 * Each caller passes its own storage key so the dismiss state is stored separately.
 */

import { getJSON, setJSON } from '../persistence/storage.js';

/**
 * Persists a dismissed flag for the given key.
 * @param {string} key - Storage key
 */
export const markDismissed = async (key) => {
    await setJSON(key, { dismissed: true, timestamp: Date.now() });
};

/**
 * Returns true if the prompt for the given key was previously dismissed.
 * @param {string} key - Storage key
 * @returns {Promise<boolean>}
 */
export const wasDismissed = async (key) => {
    const data = await getJSON(key);
    return Boolean(data?.dismissed);
};
