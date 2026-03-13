import { beforeEach, describe, expect, it, vi } from 'vitest';

const setupDom = () => {
    document.body.innerHTML = `
        <div data-platform-status></div>
        <input id="setting-voice" type="checkbox" />
        <p data-voice-note></p>
    `;
};

const installMatchMedia = () => {
    const query = {
        matches: false,
        addEventListener: vi.fn((event) => {
            if (event !== 'change') return;
        }),
        removeEventListener: vi.fn((event) => {
            if (event !== 'change') return;
        }),
    };
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn(() => query),
    });
    return query;
};

const installLegacyMatchMedia = () => {
    const query = {
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
    };
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn(() => query),
    });
    return query;
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

    it('binds standalone change listeners through the legacy Safari fallback', async () => {
        const query = installLegacyMatchMedia();

        const module = await import('../src/platform/ipados-capabilities.js');
        module.init();

        expect(query.addListener).toHaveBeenCalledTimes(1);
    });
});
