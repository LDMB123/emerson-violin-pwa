import { describe, expect, it } from 'vitest';
import { getCheckboxInput, getMatchingInputTarget, setTextContent } from '../../src/utils/dom-utils.js';

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

describe('utils/dom-utils getMatchingInputTarget', () => {
    it('returns null for non-input targets', () => {
        const div = document.createElement('div');
        expect(getMatchingInputTarget(div, { id: 'voice' })).toBeNull();
    });

    it('matches by id', () => {
        const input = document.createElement('input');
        input.id = 'voice';
        expect(getMatchingInputTarget(input, { id: 'voice' })).toBe(input);
    });

    it('matches by selector', () => {
        const input = document.createElement('input');
        input.setAttribute('data-parent-pin-input', '');
        expect(getMatchingInputTarget(input, { selector: '[data-parent-pin-input]' })).toBe(input);
    });

    it('returns null when no matcher matches', () => {
        const input = document.createElement('input');
        input.id = 'something-else';
        expect(
            getMatchingInputTarget(input, {
                id: 'parent-pin-input',
                selector: '[data-parent-pin-input]',
            }),
        ).toBeNull();
    });
});

describe('utils/dom-utils setTextContent', () => {
    it('sets text content when element exists', () => {
        const div = document.createElement('div');
        setTextContent(div, 'Ready');
        expect(div.textContent).toBe('Ready');
    });

    it('does not throw when element is missing', () => {
        expect(() => setTextContent(null, 'Ignored')).not.toThrow();
    });
});
