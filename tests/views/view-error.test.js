import { describe, expect, it, vi } from 'vitest';
import { showViewError } from '../../src/views/view-error.js';

describe('views/view-error', () => {
    it('renders a user-facing error card into main-content', () => {
        document.body.innerHTML = '<main id="main-content"></main>';
        showViewError('Network failed');

        const container = document.getElementById('main-content');
        expect(container?.querySelector('.view-error')).not.toBeNull();
        expect(container?.textContent).toContain('Oops! Something went wrong');
        expect(container?.textContent).toContain('Network failed');
    });

    it('escapes message HTML before rendering', () => {
        document.body.innerHTML = '<main id="main-content"></main>';
        showViewError('<img src=x onerror=alert(1)>');

        const container = document.getElementById('main-content');
        expect(container?.innerHTML).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(container?.querySelector('img')).toBeNull();
    });

    it('returns early when main-content is missing', () => {
        document.body.innerHTML = '';
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => showViewError('No container')).not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith('[ViewError] main-content container not found');
    });
});
