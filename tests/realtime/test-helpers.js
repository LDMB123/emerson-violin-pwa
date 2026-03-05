import { vi } from 'vitest';

export const createStorageMocks = () => ({
    getJSON: vi.fn(async () => null),
    setJSON: vi.fn(async () => {}),
});

export const resetStorageMocks = (storageMocks) => {
    storageMocks.getJSON.mockClear();
    storageMocks.getJSON.mockResolvedValue(null);
    storageMocks.setJSON.mockClear();
};
