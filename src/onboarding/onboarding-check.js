import { getJSON } from '../persistence/storage.js';

const STORAGE_KEY = 'onboarding-complete';

export const shouldShowOnboarding = async () => {
    const complete = await getJSON(STORAGE_KEY);
    return !complete;
};
