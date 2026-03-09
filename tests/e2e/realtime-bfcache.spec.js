import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { dispatchPagehide } from './helpers/bfcache-events.js';
import {
    installRealtimeBfcacheProbe,
    waitForRealtimeHooks,
    startRealtimeSession,
    getRealtimeSessionState,
    getProbe
} from './helpers/realtime-harness.js';

test.skip('realtime session ignores persisted pagehide and stops on unload pagehide', async ({ page }) => {
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
