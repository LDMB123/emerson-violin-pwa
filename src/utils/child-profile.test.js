import { describe, expect, it } from 'vitest';
import { persistChildName, readChildName } from './child-profile.js';

describe('child-profile', () => {
    it('reads older raw values and repairs them on save', () => {
        const storage = new Map();
        const localStorage = {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: (key) => storage.delete(key),
        };

        storage.set('emerson_violin_child_name', 'Emerson');
        expect(readChildName(localStorage)).toBe('Emerson');

        persistChildName(' Emerson  ', localStorage);
        expect(storage.get('emerson_violin_child_name')).toBe(JSON.stringify('Emerson'));
        expect(storage.get('panda-violin:child-name-v1')).toBe(JSON.stringify('Emerson'));
    });
});
