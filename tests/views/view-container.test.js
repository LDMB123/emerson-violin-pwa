import { describe, expect, it, vi } from 'vitest';
import { getMainContentContainer } from '../../src/views/view-container.js';

describe('views/view-container', () => {
    it('returns #main-content when present', () => {
        document.body.innerHTML = '<main id="main-content"></main>';
        const container = getMainContentContainer();
        expect(container?.id).toBe('main-content');
    });

    it('returns null and logs when #main-content is missing', () => {
        document.body.innerHTML = '';
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const container = getMainContentContainer('TestScope');

        expect(container).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('[TestScope] main-content container not found');
    });
});
