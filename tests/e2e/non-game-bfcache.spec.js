import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';
import { dispatchPagehide } from './helpers/bfcache-events.js';
import { seedKVValue } from './helpers/seed-kv.js';
import { gotoAndExpectView, setParentUnlocked } from './helpers/view-navigation.js';

const RECORDINGS_KEY = 'panda-violin:recordings:v1';
const SAMPLE_RECORDING = {
    title: 'Session Clip',
    duration: 12,
    dataUrl: 'data:audio/mp3;base64,AAA',
    createdAt: Date.now(),
};

const installRealtimeAndAudioDoubles = async (page) => {
    await page.addInitScript(() => {
        window.__bfcacheProbe = {
            audioPlayCalls: 0,
            audioPauseCalls: 0,
            rtStartedEvents: 0,
            rtStoppedEvents: 0,
        };

        class FakeAudio {
            constructor() {
                this.preload = 'none';
                this.paused = true;
                this.currentTime = 0;
                this.src = '';
                this.muted = false;
                this._listeners = new Map();
            }

            play() {
                this.paused = false;
                window.__bfcacheProbe.audioPlayCalls += 1;
                return Promise.resolve();
            }

            pause() {
                this.paused = true;
                window.__bfcacheProbe.audioPauseCalls += 1;
            }

            addEventListener(type, handler, options = undefined) {
                const listeners = this._listeners.get(type) || [];
                listeners.push({
                    handler,
                    once: Boolean(options && typeof options === 'object' && options.once),
                });
                this._listeners.set(type, listeners);
            }

            removeEventListener(type, handler) {
                const listeners = this._listeners.get(type) || [];
                this._listeners.set(
                    type,
                    listeners.filter((listener) => listener.handler !== handler),
                );
            }
        }

        window.Audio = FakeAudio;

        const createNode = () => ({
            connect(target) {
                return target || this;
            },
            disconnect() {},
        });

        class FakeAudioWorkletNode {
            constructor() {
                this.port = { onmessage: null };
            }

            connect(target) {
                return target || this;
            }

            disconnect() {}
        }

        class FakeAudioContext {
            constructor() {
                this.state = 'suspended';
                this.audioWorklet = {
                    addModule: async () => {},
                };
                this.destination = {};
            }

            createMediaStreamSource() {
                return createNode();
            }

            createGain() {
                const gainNode = createNode();
                gainNode.gain = { value: 0 };
                return gainNode;
            }

            async resume() {
                this.state = 'running';
            }

            async suspend() {
                this.state = 'suspended';
            }

            async close() {
                this.state = 'closed';
            }
        }

        window.AudioContext = FakeAudioContext;
        window.webkitAudioContext = FakeAudioContext;
        window.AudioWorkletNode = FakeAudioWorkletNode;

        if (!navigator.mediaDevices) {
            Object.defineProperty(navigator, 'mediaDevices', {
                value: {},
                configurable: true,
            });
        }
        navigator.mediaDevices.getUserMedia = async () => ({
            getTracks: () => [{ stop() {} }],
        });

        document.addEventListener('panda:rt-session-started', () => {
            window.__bfcacheProbe.rtStartedEvents += 1;
        });
        document.addEventListener('panda:rt-session-stopped', () => {
            window.__bfcacheProbe.rtStoppedEvents += 1;
        });
    });
};

const getProbe = async (page) =>
    page.evaluate(() => ({
        audioPlayCalls: window.__bfcacheProbe.audioPlayCalls,
        audioPauseCalls: window.__bfcacheProbe.audioPauseCalls,
        rtStartedEvents: window.__bfcacheProbe.rtStartedEvents,
        rtStoppedEvents: window.__bfcacheProbe.rtStoppedEvents,
    }));
const playRecordingAndAssertPagehideBehavior = async (page, playButton) => {
    await expect(playButton).toBeEnabled();
    await playButton.evaluate((button) => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    const beforePersisted = await getProbe(page);
    await dispatchPagehide(page, true);
    const afterPersisted = await getProbe(page);
    expect(afterPersisted.audioPauseCalls).toBe(beforePersisted.audioPauseCalls);

    await dispatchPagehide(page, false);
    const afterUnload = await getProbe(page);
    expect(afterUnload.audioPauseCalls).toBeGreaterThan(afterPersisted.audioPauseCalls);
};

const openRecordingsView = async ({
    page,
    viewHash,
    recordingsTitleSelector,
    recordingsPlayButtonSelector,
    parentUnlocked = false,
} = {}) => {
    await installRealtimeAndAudioDoubles(page);
    await openHome(page);

    await seedKVValue(page, RECORDINGS_KEY, [SAMPLE_RECORDING]);
    await setParentUnlocked(page, parentUnlocked);
    await gotoAndExpectView(page, viewHash);
    await page.evaluate(() => {
        window.dispatchEvent(new Event('panda:recordings-updated'));
    });
    await expect(page.locator(recordingsTitleSelector).first()).toContainText('Session Clip');
    return page.locator(recordingsPlayButtonSelector).first();
};

test('session review recordings ignore persisted pagehide and stop on unload pagehide', async ({ page }) => {
    const playButton = await openRecordingsView({
        page,
        viewHash: '#view-analysis',
        recordingsTitleSelector: '#view-analysis [data-analysis="recording-title"]',
        recordingsPlayButtonSelector: '#view-analysis .analysis-recording .recording-play',
    });
    await expect.poll(async () => playButton.getAttribute('data-bound')).toBe('true');
    await expect(playButton).toHaveAttribute('data-recording-available', 'true');
    await playRecordingAndAssertPagehideBehavior(page, playButton);
});

test('parent recordings ignore persisted pagehide and stop on unload pagehide', async ({ page }) => {
    const playButton = await openRecordingsView({
        page,
        viewHash: '#view-parent',
        recordingsTitleSelector: '#view-parent [data-parent-recordings] .recording-title',
        recordingsPlayButtonSelector: '#view-parent [data-parent-recordings] .recording-play',
        parentUnlocked: true,
    });
    await playRecordingAndAssertPagehideBehavior(page, playButton);
});
