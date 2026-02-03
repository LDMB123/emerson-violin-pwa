import { describe, expect, it, vi } from 'vitest';
import { getViewId, onViewChange } from '@core/utils/view-events.js';

describe('view events', () => {
    it('returns current view from hash', () => {
        window.location.hash = '#view-coach';
        expect(getViewId()).toBe('view-coach');
        window.location.hash = '';
        expect(getViewId()).toBe('view-home');
    });

    it('fires on hashchange', () => {
        const handler = vi.fn();
        const cleanup = onViewChange(handler, { includePanda: false });
        window.location.hash = '#view-games';
        window.dispatchEvent(new Event('hashchange'));
        expect(handler).toHaveBeenCalledWith('view-games');
        cleanup();
    });

    it('fires on panda:view-change', () => {
        const handler = vi.fn();
        const cleanup = onViewChange(handler, { includeHash: false });
        document.dispatchEvent(new CustomEvent('panda:view-change', { detail: { viewId: 'view-settings' } }));
        expect(handler).toHaveBeenCalledWith('view-settings');
        cleanup();
    });

    it('respects includePanda=false', () => {
        const handler = vi.fn();
        const cleanup = onViewChange(handler, { includePanda: false });
        document.dispatchEvent(new CustomEvent('panda:view-change', { detail: { viewId: 'view-parent' } }));
        expect(handler).not.toHaveBeenCalled();
        cleanup();
    });

    it('supports immediate invocation', () => {
        window.location.hash = '#view-progress';
        const handler = vi.fn();
        const cleanup = onViewChange(handler, { immediate: true, includePanda: false });
        expect(handler).toHaveBeenCalledWith('view-progress');
        cleanup();
    });
});
