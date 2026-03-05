import { vi } from 'vitest';

export const resetMockCollection = (mocks) => {
    Object.values(mocks).forEach((mock) => {
        if (typeof mock?.mockClear === 'function') {
            mock.mockClear();
        }
    });
};

export const createDisposableReport = ({ onUpdate } = {}) => {
    const report = vi.fn();
    report.dispose = vi.fn();
    onUpdate?.({ difficulty: 'medium' });
    return report;
};

export const createPersistedPagehideEvent = () => {
    const event = typeof PageTransitionEvent === 'function'
        ? new PageTransitionEvent('pagehide', { persisted: true })
        : new Event('pagehide');

    if (!('persisted' in event) || event.persisted !== true) {
        try {
            Object.defineProperty(event, 'persisted', {
                configurable: true,
                get: () => true,
            });
        } catch {
            // no-op
        }
    }

    return event;
};
