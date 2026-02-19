import { beforeEach, describe, expect, it, vi } from 'vitest';

const setupDom = () => {
    document.body.innerHTML = `
        <div data-platform-status></div>
        <input id="setting-voice" type="checkbox" />
        <p data-voice-note></p>
    `;
};

const installMatchMedia = () => {
    const listeners = new Set();
    const query = {
        matches: false,
        addEventListener: vi.fn((event, callback) => {
            if (event === 'change') listeners.add(callback);
        }),
        removeEventListener: vi.fn((event, callback) => {
            if (event === 'change') listeners.delete(callback);
        }),
    };
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn(() => query),
    });
};

describe('ipados-capabilities', () => {
    beforeEach(() => {
        vi.resetModules();
        setupDom();
        installMatchMedia();
    });

    it('does not override persisted voice coach preference dataset', async () => {
        document.documentElement.dataset.voiceCoach = 'off';

        const module = await import('../src/platform/ipados-capabilities.js');
        module.init();

        expect(document.documentElement.dataset.voiceCoach).toBe('off');
        expect(document.documentElement.dataset.voiceSupport).toBe('true');
    });
});
