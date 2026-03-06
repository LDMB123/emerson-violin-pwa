import { Window } from 'happy-dom';

const hasWorkingStorage = (storage) => Boolean(
    storage
    && typeof storage.getItem === 'function'
    && typeof storage.setItem === 'function'
    && typeof storage.removeItem === 'function'
    && typeof storage.clear === 'function'
);

const assignGlobal = (name, value) => {
    Object.defineProperty(globalThis, name, {
        configurable: true,
        writable: true,
        value,
    });

    if (globalThis.window && globalThis.window !== globalThis) {
        Object.defineProperty(globalThis.window, name, {
            configurable: true,
            writable: true,
            value,
        });
    }
};

const ensureWorkingStorage = () => {
    if (hasWorkingStorage(globalThis.localStorage) && hasWorkingStorage(globalThis.sessionStorage)) {
        return;
    }

    const shimWindow = new Window();

    assignGlobal('Storage', shimWindow.Storage);
    assignGlobal('localStorage', shimWindow.localStorage);
    assignGlobal('sessionStorage', shimWindow.sessionStorage);
};

ensureWorkingStorage();
