export const seedKVValue = async (page, key, value) => {
    if (key === 'onboarding-complete' && value === true) {
        await seedKVValue(page, 'panda-violin:child-name-v1', "Emerson");
    }
    await page.evaluate(async ({ targetKey, targetValue }) => {
        const toTimestamp = (input, fallback = Date.now()) => (
            Number.isFinite(input) ? input : fallback
        );
        const parseCreatedAtTimestamp = (input, fallback = Date.now()) => {
            if (typeof input !== 'string') return fallback;
            const parsed = Date.parse(input);
            return Number.isFinite(parsed) ? parsed : fallback;
        };
        const asStringOrEmpty = (input) => (typeof input === 'string' ? input : '');
        const createLogRow = (entry) => {
            if (!entry || typeof entry !== 'object') return null;
            return {
                timestamp: toTimestamp(entry.timestamp),
                type: asStringOrEmpty(entry.type),
                entityId: asStringOrEmpty(entry.id),
                value: entry,
            };
        };
        const createRecordingRow = (entry) => {
            if (!entry || typeof entry !== 'object') return null;
            return {
                timestamp: toTimestamp(entry.timestamp, parseCreatedAtTimestamp(entry.createdAt)),
                type: 'recording',
                entityId: asStringOrEmpty(entry.id),
                value: entry,
            };
        };
        const collectionKeyToStore = {
            'panda-violin:events:v1': {
                name: 'events',
                rowFromValue: (entry) => {
                    const row = createLogRow(entry);
                    if (!row) return null;
                    return {
                        ...row,
                        day: Number.isFinite(entry.day) ? entry.day : null,
                    };
                },
            },
            'panda-violin:recordings:v1': {
                name: 'recordings',
                rowFromValue: createRecordingRow,
            },
            'panda-violin:ml:events:v1': {
                name: 'ml-log',
                rowFromValue: createLogRow,
            },
            'panda-violin:rt:events:v1': {
                name: 'rt-events',
                rowFromValue: createLogRow,
            },
        };
        const collectionStores = [
            {
                name: 'events',
                indexes: [
                    ['by-timestamp', 'timestamp'],
                    ['by-day', 'day'],
                    ['by-type', 'type'],
                    ['by-entity', 'entityId'],
                ],
            },
            {
                name: 'recordings',
                indexes: [
                    ['by-timestamp', 'timestamp'],
                    ['by-entity', 'entityId'],
                ],
            },
            {
                name: 'ml-log',
                indexes: [
                    ['by-timestamp', 'timestamp'],
                    ['by-type', 'type'],
                    ['by-entity', 'entityId'],
                ],
            },
            {
                name: 'rt-events',
                indexes: [
                    ['by-timestamp', 'timestamp'],
                    ['by-type', 'type'],
                ],
            },
        ];
        const fallbackKey = `panda-violin:kv:${targetKey}`;
        localStorage.setItem(targetKey, JSON.stringify(targetValue));
        localStorage.setItem(fallbackKey, JSON.stringify(targetValue));

        await new Promise((resolve, reject) => {
            const request = indexedDB.open('panda-violin-db', 3);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('kv')) {
                    db.createObjectStore('kv');
                }
                if (!db.objectStoreNames.contains('blobs')) {
                    db.createObjectStore('blobs');
                }
                collectionStores.forEach(({ name, indexes }) => {
                    const store = db.objectStoreNames.contains(name)
                        ? request.transaction.objectStore(name)
                        : db.createObjectStore(name, { keyPath: 'pk', autoIncrement: true });
                    indexes.forEach(([indexName, keyPath]) => {
                        if (!store.indexNames.contains(indexName)) {
                            store.createIndex(indexName, keyPath);
                        }
                    });
                });
            };

            request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
            request.onsuccess = () => {
                const db = request.result;
                const collectionDef = collectionKeyToStore[targetKey] || null;
                const storeNames = collectionDef ? ['kv', collectionDef.name] : ['kv'];
                const tx = db.transaction(storeNames, 'readwrite');
                tx.objectStore('kv').put(targetValue, targetKey);
                if (collectionDef) {
                    const collectionStore = tx.objectStore(collectionDef.name);
                    collectionStore.clear();
                    const values = Array.isArray(targetValue) ? targetValue : [];
                    values.forEach((entry) => {
                        const row = collectionDef.rowFromValue(entry);
                        if (row) {
                            collectionStore.add(row);
                        }
                    });
                }
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => {
                    const err = tx.error;
                    db.close();
                    reject(err || new Error('IndexedDB write failed'));
                };
                tx.onabort = () => {
                    const err = tx.error;
                    db.close();
                    reject(err || new Error('IndexedDB write aborted'));
                };
            };
        });
    }, { targetKey: key, targetValue: value });
};
