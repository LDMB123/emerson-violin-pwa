import { describe, expect, it, vi } from 'vitest';
import { writeJsonToStorage } from '../src/utils/storage-utils.js';

describe('utils/storage-utils', () => {
    it('skips localStorage writes when the serialized JSON is unchanged', () => {
        const storage = {
            getItem: vi.fn(() => '{"score":12}'),
            setItem: vi.fn(),
        };

        const result = writeJsonToStorage('progress', { score: 12 }, storage);

        expect(result).toBe(true);
        expect(storage.getItem).toHaveBeenCalledWith('progress');
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('writes when the serialized JSON changes', () => {
        const storage = {
            getItem: vi.fn(() => '{"score":8}'),
            setItem: vi.fn(),
        };

        const result = writeJsonToStorage('progress', { score: 12 }, storage);

        expect(result).toBe(true);
        expect(storage.setItem).toHaveBeenCalledWith('progress', '{"score":12}');
    });
});
