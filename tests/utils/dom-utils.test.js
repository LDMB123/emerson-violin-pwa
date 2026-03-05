import { describe, expect, it } from 'vitest';
import { getCheckboxInput } from '../../src/utils/dom-utils.js';

describe('utils/dom-utils getCheckboxInput', () => {
    it('returns null for non-input targets', () => {
        const div = document.createElement('div');
        expect(getCheckboxInput(div)).toBeNull();
    });

    it('returns null for non-checkbox inputs', () => {
        const input = document.createElement('input');
        input.type = 'text';
        expect(getCheckboxInput(input)).toBeNull();
    });

    it('returns checkbox input when eligible', () => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        expect(getCheckboxInput(input)).toBe(input);
    });

    it('respects requireChecked option', () => {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = false;
        expect(getCheckboxInput(input, { requireChecked: true })).toBeNull();

        input.checked = true;
        expect(getCheckboxInput(input, { requireChecked: true })).toBe(input);
    });
});
