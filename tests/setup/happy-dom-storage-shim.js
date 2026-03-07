import { Window } from 'happy-dom';

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

const installStableStorage = () => {
    const shimWindow = new Window();

    assignGlobal('Storage', shimWindow.Storage);
    assignGlobal('localStorage', shimWindow.localStorage);
    assignGlobal('sessionStorage', shimWindow.sessionStorage);
};

installStableStorage();
