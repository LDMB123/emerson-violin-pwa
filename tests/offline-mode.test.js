import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
    getJSON: vi.fn(),
    setJSON: vi.fn(),
}));

const swSupport = vi.hoisted(() => ({
    hasServiceWorkerSupport: vi.fn(),
}));

vi.mock('../src/persistence/storage.js', () => ({
    getJSON: storage.getJSON,
    setJSON: storage.setJSON,
}));

vi.mock('../src/platform/sw-support.js', () => ({
    hasServiceWorkerSupport: swSupport.hasServiceWorkerSupport,
}));

const mount = () => {
    document.documentElement.removeAttribute('data-offline-mode');
    document.body.innerHTML = `
        <input id="setting-offline-mode" type="checkbox" />
        <p data-offline-mode-status></p>
    `;
};

const setServiceWorker = (serviceWorker) => {
    Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        writable: true,
        value: serviceWorker,
    });
};

describe('platform/offline-mode', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mount();
        storage.getJSON.mockResolvedValue({ enabled: false });
        storage.setJSON.mockResolvedValue(undefined);
        swSupport.hasServiceWorkerSupport.mockReturnValue(true);
        setServiceWorker({
            ready: Promise.resolve({ active: null }),
            getRegistration: vi.fn(async () => null),
            addEventListener: vi.fn(),
        });
    });

    it('completes init even when serviceWorker.ready never resolves', async () => {
        setServiceWorker({
            ready: new Promise(() => {}),
            getRegistration: vi.fn(async () => null),
            addEventListener: vi.fn(),
        });

        const module = await import('../src/platform/offline-mode.js');
        await module.init();

        const toggle = document.querySelector('#setting-offline-mode');
        const status = document.querySelector('[data-offline-mode-status]');
        expect(toggle?.disabled).toBe(false);
        expect(toggle?.dataset.offlineModeBound).toBe('true');
        expect(status?.textContent || '').toContain('Offline mode is off');
    });

    it('posts offline mode updates and persists changes when toggled', async () => {
        const postMessage = vi.fn();
        setServiceWorker({
            ready: Promise.resolve({ active: { postMessage } }),
            getRegistration: vi.fn(async () => ({ active: { postMessage } })),
            addEventListener: vi.fn(),
        });

        const module = await import('../src/platform/offline-mode.js');
        await module.init();

        const toggle = document.querySelector('#setting-offline-mode');
        expect(toggle).not.toBeNull();
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));

        await vi.waitFor(() => {
            expect(postMessage).toHaveBeenCalledWith({
                type: 'SET_OFFLINE_MODE',
                value: true,
            });
            expect(storage.setJSON).toHaveBeenCalledWith(
                'panda-violin:offline:mode-v1',
                expect.objectContaining({ enabled: true }),
            );
        });
    });
});
