import { getJSON, setJSON } from '../persistence/storage.js';
import { createPinHash } from './pin-crypto.js';

const DEFAULT_PIN = '1001';

const createDefaultPinData = async () => {
    const { hash, salt } = await createPinHash(DEFAULT_PIN);
    return {
        hash,
        salt,
        createdAt: Date.now(),
    };
};

const persistPinData = async (pinKey, data) => {
    await setJSON(pinKey, data);
    return data;
};

/** Normalizes user PIN input down to a four-digit numeric string. */
export const normalizePin = (value) => (value || '').replace(/\D/g, '').slice(0, 4);

/** Returns whether the Parent Zone is unlocked for the current tab session. */
export const isParentUnlocked = (unlockKey) => sessionStorage.getItem(unlockKey) === 'true';

/** Marks the Parent Zone unlocked for the current tab session. */
export const markParentUnlocked = (unlockKey) => {
    sessionStorage.setItem(unlockKey, 'true');
};

/** Loads the persisted PIN hash, creating or migrating one if necessary. */
export const loadPinData = async ({ pinKey, legacyPinKey }) => {
    const stored = await getJSON(pinKey);
    if (stored?.hash && stored?.salt) {
        return stored;
    }

    const legacy = await getJSON(legacyPinKey);
    if (legacy?.hash) {
        const migrated = await createDefaultPinData();
        const next = {
            ...migrated,
            migrated: true,
        };
        return persistPinData(pinKey, next);
    }

    const created = await createDefaultPinData();
    return persistPinData(pinKey, created);
};

/** Hashes and persists a newly chosen parent PIN. */
export const savePinData = async ({ pinKey, pin }) => {
    const { hash, salt } = await createPinHash(pin);
    const next = {
        hash,
        salt,
        updatedAt: Date.now(),
    };
    return persistPinData(pinKey, next);
};
