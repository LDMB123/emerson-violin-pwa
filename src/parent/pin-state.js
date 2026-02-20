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

export const normalizePin = (value) => (value || '').replace(/\D/g, '').slice(0, 4);

export const isParentUnlocked = (unlockKey) => sessionStorage.getItem(unlockKey) === 'true';

export const markParentUnlocked = (unlockKey) => {
    sessionStorage.setItem(unlockKey, 'true');
};

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
        await setJSON(pinKey, next);
        return next;
    }

    const created = await createDefaultPinData();
    await setJSON(pinKey, created);
    return created;
};

export const savePinData = async ({ pinKey, pin }) => {
    const { hash, salt } = await createPinHash(pin);
    const next = {
        hash,
        salt,
        updatedAt: Date.now(),
    };
    await setJSON(pinKey, next);
    return next;
};
