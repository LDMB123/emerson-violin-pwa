import { vi } from 'vitest';

export const setDocumentVisibility = (value) => {
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value,
    });
    Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: value !== 'visible',
    });
};

export const installWindowIntervalMocks = ({ startId = 1 } = {}) => {
    let nextIntervalId = startId;
    window.setInterval = vi.fn(() => nextIntervalId++);
    window.clearInterval = vi.fn();
};

export const installRafMocks = ({ startId = 1 } = {}) => {
    const callbacks = new Map();
    let nextRafId = startId;

    globalThis.requestAnimationFrame = vi.fn((callback) => {
        const id = nextRafId++;
        callbacks.set(id, callback);
        return id;
    });

    globalThis.cancelAnimationFrame = vi.fn((id) => {
        callbacks.delete(id);
    });

    const runQueuedFrames = (time = performance.now()) => {
        const entries = [...callbacks.entries()];
        callbacks.clear();
        entries.forEach(([, callback]) => callback(time));
    };

    const teardown = () => {
        delete globalThis.requestAnimationFrame;
        delete globalThis.cancelAnimationFrame;
    };

    return {
        runQueuedFrames,
        teardown,
    };
};
