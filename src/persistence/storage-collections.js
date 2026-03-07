import {
    EVENTS_KEY,
    RECORDINGS_KEY,
    ML_LOG_KEY,
    RT_EVENT_LOG_KEY,
} from './storage-keys.js';

const COLLECTION_TIMESTAMP_INDEX = 'by-timestamp';
const COLLECTION_DAY_INDEX = 'by-day';
const COLLECTION_TYPE_INDEX = 'by-type';
const COLLECTION_ENTITY_INDEX = 'by-entity';

const asStringOrEmpty = (value) => (typeof value === 'string' ? value : '');

const toTimestamp = (value, fallback = Date.now()) => (
    Number.isFinite(value) ? value : fallback
);

const parseCreatedAtTimestamp = (value, fallback = Date.now()) => {
    if (typeof value !== 'string') return fallback;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const createEventRow = (value) => {
    if (!value || typeof value !== 'object') return null;
    return {
        timestamp: toTimestamp(value.timestamp),
        day: Number.isFinite(value.day) ? value.day : null,
        type: asStringOrEmpty(value.type),
        entityId: asStringOrEmpty(value.id),
        value,
    };
};

const createRecordingRow = (value) => {
    if (!value || typeof value !== 'object') return null;
    return {
        timestamp: toTimestamp(value.timestamp, parseCreatedAtTimestamp(value.createdAt)),
        type: 'recording',
        entityId: asStringOrEmpty(value.id),
        value,
    };
};

const createLogRow = (value) => {
    if (!value || typeof value !== 'object') return null;
    return {
        timestamp: toTimestamp(value.timestamp),
        type: asStringOrEmpty(value.type),
        entityId: asStringOrEmpty(value.id),
        value,
    };
};

const defaultValueFromRow = (row) => row?.value ?? null;

export const COLLECTION_STORE_DEFS = [
    {
        key: EVENTS_KEY,
        storeName: 'events',
        rowFromValue: createEventRow,
        valueFromRow: defaultValueFromRow,
        trimIndexName: COLLECTION_TIMESTAMP_INDEX,
        indexes: [
            { name: COLLECTION_TIMESTAMP_INDEX, keyPath: 'timestamp' },
            { name: COLLECTION_DAY_INDEX, keyPath: 'day' },
            { name: COLLECTION_TYPE_INDEX, keyPath: 'type' },
            { name: COLLECTION_ENTITY_INDEX, keyPath: 'entityId' },
        ],
    },
    {
        key: RECORDINGS_KEY,
        storeName: 'recordings',
        rowFromValue: createRecordingRow,
        valueFromRow: defaultValueFromRow,
        trimIndexName: COLLECTION_TIMESTAMP_INDEX,
        indexes: [
            { name: COLLECTION_TIMESTAMP_INDEX, keyPath: 'timestamp' },
            { name: COLLECTION_ENTITY_INDEX, keyPath: 'entityId' },
        ],
    },
    {
        key: ML_LOG_KEY,
        storeName: 'ml-log',
        rowFromValue: createLogRow,
        valueFromRow: defaultValueFromRow,
        trimIndexName: COLLECTION_TIMESTAMP_INDEX,
        indexes: [
            { name: COLLECTION_TIMESTAMP_INDEX, keyPath: 'timestamp' },
            { name: COLLECTION_TYPE_INDEX, keyPath: 'type' },
            { name: COLLECTION_ENTITY_INDEX, keyPath: 'entityId' },
        ],
    },
    {
        key: RT_EVENT_LOG_KEY,
        storeName: 'rt-events',
        rowFromValue: createLogRow,
        valueFromRow: defaultValueFromRow,
        trimIndexName: COLLECTION_TIMESTAMP_INDEX,
        indexes: [
            { name: COLLECTION_TIMESTAMP_INDEX, keyPath: 'timestamp' },
            { name: COLLECTION_TYPE_INDEX, keyPath: 'type' },
        ],
    },
];

const COLLECTION_STORE_DEFS_BY_KEY = new Map(
    COLLECTION_STORE_DEFS.map((definition) => [definition.key, definition]),
);

export const getCollectionStoreDef = (key) => COLLECTION_STORE_DEFS_BY_KEY.get(key) || null;

export const mapCollectionRowsToValues = (rows, definition) => {
    if (!Array.isArray(rows)) return [];
    const mapRow = definition?.valueFromRow || defaultValueFromRow;
    return rows.map((row) => mapRow(row)).filter((value) => value !== null && value !== undefined);
};
