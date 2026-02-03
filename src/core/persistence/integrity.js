const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

const hashString = (value) => {
    let hash = FNV_OFFSET;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
};

const serializeValue = (value) => {
    try {
        const serialized = JSON.stringify(value);
        return typeof serialized === 'string' ? serialized : String(value);
    } catch {
        return String(value);
    }
};

export const computeIntegrityChecksum = (value) => hashString(serializeValue(value));
