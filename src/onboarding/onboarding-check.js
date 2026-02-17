import { getJSON } from '../persistence/storage.js';
import { ONBOARDING_KEY as STORAGE_KEY } from '../persistence/storage-keys.js';

export const shouldShowOnboarding = async () => {
    const complete = await getJSON(STORAGE_KEY);
    return !complete;
};
