import { getJSON, setJSON } from '../persistence/storage.js';
import { createPinHash } from './pin-crypto.js';

const LEGACY_ONBOARDING_PIN_KEY = 'PARENT_PIN_KEY';

const persistPinData = async (pinKey, data) => {
    await setJSON(pinKey, data);
    return data;
};

const decodeLegacyPin = (rawValue) => {
    if (typeof rawValue !== 'string' || !rawValue.trim()) return '';

    try {
        const decoded = typeof atob === 'function'
            ? atob(rawValue)
            : Buffer.from(rawValue, 'base64').toString('utf8');
        return normalizePin(decoded);
    } catch {
        return normalizePin(rawValue);
    }
};

const migrateLegacyOnboardingPin = async ({ pinKey, storage }) => {
    if (!storage) return null;

    const pin = decodeLegacyPin(storage.getItem(LEGACY_ONBOARDING_PIN_KEY));
    if (pin.length !== 4) return null;

    const { hash, salt } = await createPinHash(pin);
    const next = {
        hash,
        salt,
        createdAt: Date.now(),
        migrated: true,
    };

    try {
        storage.removeItem(LEGACY_ONBOARDING_PIN_KEY);
    } catch {
        // Ignore localStorage cleanup failures after the secure record is persisted.
    }

    return persistPinData(pinKey, next);
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
export const loadPinData = async ({ pinKey, legacyPinKey, storage = globalThis?.localStorage }) => {
    const stored = await getJSON(pinKey);
    if (stored?.hash && stored?.salt) {
        return stored;
    }

    const legacy = await getJSON(legacyPinKey);
    if (legacy?.hash) {
        const migrated = {
            ...legacy,
            migrated: true,
        };
        const next = {
            hash: migrated.hash,
            salt: migrated.salt,
            createdAt: migrated.createdAt || Date.now(),
            migrated: true,
        };
        return persistPinData(pinKey, next);
    }

    const onboardingMigration = await migrateLegacyOnboardingPin({ pinKey, storage });
    if (onboardingMigration?.hash && onboardingMigration?.salt) {
        return onboardingMigration;
    }

    return null;
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
