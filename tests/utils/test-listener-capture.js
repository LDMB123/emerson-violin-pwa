import { vi } from 'vitest';

export const captureAddedListeners = (target) => {
    const listeners = [];
    const originalAddEventListener = target.addEventListener.bind(target);
    const spy = vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
        listeners.push([type, listener, options]);
        return originalAddEventListener(type, listener, options);
    });

    const restore = () => {
        listeners.splice(0).forEach(([type, listener, options]) => {
            target.removeEventListener(type, listener, options);
        });
        spy.mockRestore();
    };

    return {
        restore,
    };
};

export const setupModuleImportDomTest = ({
    html = '',
    setupState,
    captureWindow = false,
} = {}) => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    if (typeof setupState === 'function') {
        setupState();
    }
    document.body.innerHTML = html;

    return {
        documentListenerCapture: captureAddedListeners(document),
        windowListenerCapture: captureWindow ? captureAddedListeners(window) : null,
    };
};

export const teardownModuleImportDomTest = ({
    documentListenerCapture,
    windowListenerCapture,
} = {}) => {
    documentListenerCapture?.restore();
    windowListenerCapture?.restore();
    vi.useRealTimers();
    document.body.innerHTML = '';
};
