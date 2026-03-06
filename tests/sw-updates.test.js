import { beforeEach, describe, expect, it, vi } from 'vitest';

const swSupport = vi.hoisted(() => ({
    hasServiceWorkerSupport: vi.fn(() => true),
}));

const updateFlowFactory = vi.hoisted(() => ({
    create: vi.fn(),
    controller: {
        bindUpdateFlow: vi.fn(),
        handleControllerChange: vi.fn(),
    },
}));

const refreshFactory = vi.hoisted(() => ({
    create: vi.fn(),
    controller: {
        registerBackgroundRefresh: vi.fn(),
    },
}));

vi.mock('../src/platform/sw-support.js', () => ({
    hasServiceWorkerSupport: swSupport.hasServiceWorkerSupport,
}));

vi.mock('../src/platform/sw-update-flow.js', () => ({
    createSwUpdateFlowController: (...args) => updateFlowFactory.create(...args),
}));

vi.mock('../src/platform/sw-refresh-controller.js', () => ({
    createSwRefreshController: (...args) => refreshFactory.create(...args),
}));

const mount = () => {
    document.body.innerHTML = `
        <p data-sw-status></p>
        <p data-sync-status></p>
        <button data-sw-update type="button"></button>
        <button data-sw-apply type="button"></button>
    `;
};

const setServiceWorker = (serviceWorker) => {
    Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        writable: true,
        value: serviceWorker,
    });
};

describe('platform/sw-updates', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mount();
        swSupport.hasServiceWorkerSupport.mockReturnValue(true);
        updateFlowFactory.create.mockReturnValue(updateFlowFactory.controller);
        refreshFactory.create.mockReturnValue(refreshFactory.controller);
    });

    it('re-enables the update button once a registration becomes available', async () => {
        const registration = { waiting: null };
        const getRegistration = vi.fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(registration);
        setServiceWorker({
            getRegistration,
            addEventListener: vi.fn(),
        });

        const module = await import('../src/platform/sw-updates.js');
        await module.init();

        const updateButton = document.querySelector('[data-sw-update]');
        expect(updateButton?.disabled).toBe(true);

        await module.init();

        expect(updateButton?.disabled).toBe(false);
        expect(updateFlowFactory.controller.bindUpdateFlow).toHaveBeenCalledWith(registration);
        expect(refreshFactory.controller.registerBackgroundRefresh).toHaveBeenCalledWith(registration);
    });

    it('binds controllerchange without a one-shot listener so future updates still reload', async () => {
        const registration = { waiting: null };
        const addEventListener = vi.fn();
        setServiceWorker({
            getRegistration: vi.fn(async () => registration),
            addEventListener,
        });

        const module = await import('../src/platform/sw-updates.js');
        await module.init();

        expect(addEventListener).toHaveBeenCalledWith(
            'controllerchange',
            updateFlowFactory.controller.handleControllerChange,
        );
        expect(addEventListener).not.toHaveBeenCalledWith(
            'controllerchange',
            updateFlowFactory.controller.handleControllerChange,
            { once: true },
        );
    });
});
