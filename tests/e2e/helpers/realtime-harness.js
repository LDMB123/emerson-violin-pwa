/**
 * Dedicated realtime simulation harness for Playwright tests.
 * Instead of relying on production code to expose internal methods on the 
 * window object (which pollutes the application), this harness uses dynamic 
 * ESM imports within page.evaluate() to drive the session controller directly.
 */

export const installRealtimeBfcacheProbe = async (page) => {
    await page.addInitScript(() => {
        window.__rtBfcacheProbe = {
            started: 0,
            stopped: 0,
        };

        try {
            Object.defineProperty(window, 'Worker', {
                configurable: true,
                writable: true,
                value: undefined,
            });
        } catch {
            // Ignore if Worker cannot be redefined in this runtime.
        }

        document.addEventListener('panda:rt-session-started', () => {
            window.__rtBfcacheProbe.started += 1;
        });
        document.addEventListener('panda:rt-session-stopped', () => {
            window.__rtBfcacheProbe.stopped += 1;
        });
    });
};

export const waitForRealtimeHooks = async (page) => {
    // Wait until Vite has served the session controller module and its deps.
    await page.waitForFunction(async () => {
        try {
            const controller = await import('/src/realtime/session-controller.js');
            return Boolean(controller && typeof controller.startSession === 'function');
        } catch {
            return false;
        }
    }, { timeout: 10000 });
};

export const startRealtimeSession = async (page) =>
    page.evaluate(async () => {
        const controller = await import('/src/realtime/session-controller.js');
        await controller.startSession();
        return controller.getSessionState();
    });

export const getRealtimeSessionState = async (page) =>
    page.evaluate(async () => {
        const controller = await import('/src/realtime/session-controller.js');
        return controller.getSessionState();
    });

export const getProbe = async (page) =>
    page.evaluate(() => ({
        started: window.__rtBfcacheProbe.started,
        stopped: window.__rtBfcacheProbe.stopped,
    }));
