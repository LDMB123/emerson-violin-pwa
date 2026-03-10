import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    values: new Map(),
}));

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async (key) => state.values.get(key) ?? null),
    setJSON: vi.fn(async (key, value) => {
        state.values.set(key, value);
    }),
}));

const cryptoMocks = vi.hoisted(() => ({
    createPinHash: vi.fn(async (pin) => ({
        hash: `hash:${pin}`,
        salt: `salt:${pin}`,
    })),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);
vi.mock('../../src/parent/pin-crypto.js', () => cryptoMocks);

import { loadPinData, savePinData } from '../../src/parent/pin-state.js';

describe('pin-state', () => {
    beforeEach(() => {
        state.values = new Map();
        storageMocks.getJSON.mockClear();
        storageMocks.setJSON.mockClear();
        cryptoMocks.createPinHash.mockClear();
    });

    it('returns null when no parent PIN has been configured', async () => {
        await expect(loadPinData({
            pinKey: 'pin-key',
            legacyPinKey: 'legacy-pin-key',
        })).resolves.toBeNull();

        expect(storageMocks.setJSON).not.toHaveBeenCalled();
    });

    it('preserves an existing secure PIN record', async () => {
        const record = {
            hash: 'hash:1234',
            salt: 'salt:1234',
            updatedAt: 123,
        };
        state.values.set('pin-key', record);

        await expect(loadPinData({
            pinKey: 'pin-key',
            legacyPinKey: 'legacy-pin-key',
        })).resolves.toEqual(record);
    });

    it('migrates a legacy hashed PIN without replacing it with a shared default', async () => {
        state.values.set('legacy-pin-key', {
            hash: 'legacy-hash',
            salt: 'legacy-salt',
            createdAt: 456,
        });

        await expect(loadPinData({
            pinKey: 'pin-key',
            legacyPinKey: 'legacy-pin-key',
        })).resolves.toEqual({
            hash: 'legacy-hash',
            salt: 'legacy-salt',
            createdAt: 456,
            migrated: true,
        });

        expect(storageMocks.setJSON).toHaveBeenCalledWith('pin-key', {
            hash: 'legacy-hash',
            salt: 'legacy-salt',
            createdAt: 456,
            migrated: true,
        });
        expect(cryptoMocks.createPinHash).not.toHaveBeenCalled();
    });

    it('migrates the prior onboarding PIN key into a hashed record', async () => {
        const storage = {
            getItem: vi.fn((key) => (key === 'PARENT_PIN_KEY' ? 'MTIzNA==' : null)),
            removeItem: vi.fn(),
        };

        await expect(loadPinData({
            pinKey: 'pin-key',
            legacyPinKey: 'legacy-pin-key',
            storage,
        })).resolves.toEqual({
            hash: 'hash:1234',
            salt: 'salt:1234',
            createdAt: expect.any(Number),
            migrated: true,
        });

        expect(cryptoMocks.createPinHash).toHaveBeenCalledWith('1234');
        expect(storage.removeItem).toHaveBeenCalledWith('PARENT_PIN_KEY');
        expect(storageMocks.setJSON).toHaveBeenCalledWith('pin-key', {
            hash: 'hash:1234',
            salt: 'salt:1234',
            createdAt: expect.any(Number),
            migrated: true,
        });
    });

    it('hashes and saves a new PIN explicitly chosen by the parent', async () => {
        await expect(savePinData({
            pinKey: 'pin-key',
            pin: '2468',
        })).resolves.toMatchObject({
            hash: 'hash:2468',
            salt: 'salt:2468',
        });

        expect(cryptoMocks.createPinHash).toHaveBeenCalledWith('2468');
        expect(storageMocks.setJSON).toHaveBeenCalledWith(
            'pin-key',
            expect.objectContaining({
                hash: 'hash:2468',
                salt: 'salt:2468',
            })
        );
    });
});
