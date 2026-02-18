import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ONBOARDING_KEY } from '../../src/persistence/storage-keys.js';

const storageMocks = vi.hoisted(() => ({
    setJSON: vi.fn(async () => {}),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);

const mountOnboardingDOM = () => {
    document.body.innerHTML = `
        <section id="view-onboarding">
            <div id="onboarding-carousel">
                <article id="onboarding-slide-1" class="onboarding-slide"></article>
                <article id="onboarding-slide-2" class="onboarding-slide"></article>
            </div>
            <button id="onboarding-start">Start</button>
            <button id="onboarding-skip">Skip</button>
            <button class="onboarding-dot" data-slide="1"></button>
            <button class="onboarding-dot" data-slide="2"></button>
        </section>
    `;
};

class MockIntersectionObserver {
    observe() {}
    disconnect() {}
}

describe('onboarding module', () => {
    beforeEach(() => {
        vi.resetModules();
        storageMocks.setJSON.mockClear();
        window.location.hash = '#view-onboarding';
        globalThis.IntersectionObserver = MockIntersectionObserver;
        mountOnboardingDOM();
    });

    it('persists completion and routes home on start', async () => {
        await import('../../src/onboarding/onboarding.js');
        document.getElementById('onboarding-start').click();
        await Promise.resolve();

        expect(storageMocks.setJSON).toHaveBeenCalledWith(ONBOARDING_KEY, true);
        expect(window.location.hash).toBe('#view-home');
    });

    it('persists completion and routes home on skip', async () => {
        await import('../../src/onboarding/onboarding.js');
        document.getElementById('onboarding-skip').click();
        await Promise.resolve();

        expect(storageMocks.setJSON).toHaveBeenCalledWith(ONBOARDING_KEY, true);
        expect(window.location.hash).toBe('#view-home');
    });
});
