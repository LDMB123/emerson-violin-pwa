import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

const installRealtimeBfcacheProbe = async (page) => {
    await page.addInitScript(() => {
        window.__PANDA_E2E_HOOKS__ = true;
        window.__PANDA_E2E_RT_SIMULATE_START__ = true;
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

const waitForRealtimeHooks = async (page) => {
    await page.waitForFunction(() => {
        const hooks = window.__PANDA_RT_TEST_HOOKS__;
        return Boolean(
            hooks &&
            typeof hooks.startSession === 'function' &&
            typeof hooks.getSessionState === 'function',
        );
    }, { timeout: 10000 });
};

const startRealtimeSession = async (page) =>
    page.evaluate(async () => {
        const hooks = window.__PANDA_RT_TEST_HOOKS__;
        await hooks.startSession();
        return hooks.getSessionState();
    });

const getRealtimeSessionState = async (page) =>
    page.evaluate(() => {
        const hooks = window.__PANDA_RT_TEST_HOOKS__;
        return hooks.getSessionState();
    });

const getProbe = async (page) =>
    page.evaluate(() => ({
        started: window.__rtBfcacheProbe.started,
        stopped: window.__rtBfcacheProbe.stopped,
    }));

const dispatchPagehide = async (page, persisted) => {
    await page.evaluate((isPersisted) => {
        const event = new Event('pagehide');
        if (isPersisted) {
            Object.defineProperty(event, 'persisted', {
                configurable: true,
                value: true,
            });
        }
        window.dispatchEvent(event);
    }, persisted);
};

test('realtime session ignores persisted pagehide and stops on unload pagehide', async ({ page }) => {
    await installRealtimeBfcacheProbe(page);
    await openHome(page);
    await waitForRealtimeHooks(page);

    const startedState = await startRealtimeSession(page);
    expect(startedState.active).toBe(true);
    expect(startedState.paused).toBe(false);
    expect(startedState.listening).toBe(true);
    await expect.poll(async () => (await getProbe(page)).started).toBeGreaterThan(0);

    const beforePersistedProbe = await getProbe(page);
    await dispatchPagehide(page, true);

    await expect.poll(async () => (await getRealtimeSessionState(page)).active).toBe(true);
    const afterPersistedProbe = await getProbe(page);
    expect(afterPersistedProbe.stopped).toBe(beforePersistedProbe.stopped);

    await dispatchPagehide(page, false);

    await expect.poll(async () => (await getRealtimeSessionState(page)).active).toBe(false);
    const stoppedState = await getRealtimeSessionState(page);
    expect(stoppedState.paused).toBe(false);
    expect(stoppedState.listening).toBe(false);
    await expect.poll(async () => (await getProbe(page)).stopped).toBeGreaterThan(afterPersistedProbe.stopped);
});
