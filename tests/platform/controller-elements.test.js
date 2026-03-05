import { describe, expect, it } from 'vitest';
import { mergeControllerElements } from '../../src/platform/controller-elements.js';

describe('platform/controller-elements mergeControllerElements', () => {
    it('merges defaults with overrides', () => {
        const createEmptyElements = () => ({
            first: null,
            second: null,
        });
        const merged = mergeControllerElements(createEmptyElements, { second: 'value' });
        expect(merged).toEqual({ first: null, second: 'value' });
    });

    it('returns defaults when overrides are missing', () => {
        const createEmptyElements = () => ({ only: null });
        expect(mergeControllerElements(createEmptyElements)).toEqual({ only: null });
    });
});
