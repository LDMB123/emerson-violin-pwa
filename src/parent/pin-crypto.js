/**
 * Web Crypto API - Enhanced PIN Security
 *
 * Uses PBKDF2 key derivation for stronger PIN hashing
 * Prevents rainbow table attacks with salting
 */

const ITERATIONS = 100000; // PBKDF2 iterations (OWASP recommended minimum)
const SALT_LENGTH = 16; // 128-bit salt

/**
 * Generate random salt
 */
const generateSalt = () => {
    const salt = new Uint8Array(SALT_LENGTH);
    crypto.getRandomValues(salt);
    return salt;
};

/**
 * Convert Uint8Array to hex string
 */
const bufferToHex = (buffer) => {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Convert hex string to Uint8Array
 */
const hexToBuffer = (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
};

/**
 * Hash PIN using PBKDF2 with salt
 * More secure than plain SHA-256
 *
 * @param {string} pin - 4-digit PIN
 * @param {Uint8Array} salt - Random salt (16 bytes)
 * @returns {Promise<string>} Hex-encoded hash
 */
const hashPinSecure = async (pin, salt) => {
    const encoder = new TextEncoder();
    const pinData = encoder.encode(pin);

    // Import PIN as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        pinData,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Derive key using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        256 // 256-bit output
    );

    return bufferToHex(derivedBits);
};

/**
 * Create PIN hash with new salt
 *
 * @param {string} pin - 4-digit PIN
 * @returns {Promise<{hash: string, salt: string}>}
 */
export const createPinHash = async (pin) => {
    const salt = generateSalt();
    const hash = await hashPinSecure(pin, salt);

    return {
        hash,
        salt: bufferToHex(salt),
    };
};

/**
 * Verify PIN against stored hash
 *
 * @param {string} pin - PIN to verify
 * @param {string} storedHash - Stored hash (hex)
 * @param {string} storedSalt - Stored salt (hex)
 * @returns {Promise<boolean>}
 */
export const verifyPin = async (pin, storedHash, storedSalt) => {
    try {
        const salt = hexToBuffer(storedSalt);
        const computedHash = await hashPinSecure(pin, salt);
        return computedHash === storedHash;
    } catch (error) {
        console.error('[PinCrypto] Verification error:', error);
        return false;
    }
};
