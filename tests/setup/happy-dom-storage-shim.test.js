import { describe, expect, it } from 'vitest';

describe('happy-dom storage shim', () => {
    it('provides a working localStorage API', () => {
        expect(typeof window.localStorage.getItem).toBe('function');
        expect(typeof window.localStorage.setItem).toBe('function');
        expect(typeof window.localStorage.removeItem).toBe('function');
        expect(typeof window.localStorage.clear).toBe('function');

        window.localStorage.setItem('shim-key', 'shim-value');
        expect(window.localStorage.getItem('shim-key')).toBe('shim-value');
        window.localStorage.clear();
        expect(window.localStorage.getItem('shim-key')).toBeNull();
    });
});
