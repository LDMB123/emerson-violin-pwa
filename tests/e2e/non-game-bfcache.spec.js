import { expect, test } from '@playwright/test';
import { openHome } from './helpers/open-home.js';

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

const seedKVValue = async (page, key, value) => {
    await page.evaluate(async ({ targetKey, targetValue }) => {
        const fallbackKey = `panda-violin:kv:${targetKey}`;
        localStorage.setItem(targetKey, JSON.stringify(targetValue));
        localStorage.setItem(fallbackKey, JSON.stringify(targetValue));

        await new Promise((resolve, reject) => {
            const request = indexedDB.open('panda-violin-db', 2);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('kv')) {
                    db.createObjectStore('kv');
                }
                if (!db.objectStoreNames.contains('blobs')) {
                    db.createObjectStore('blobs');
                }
            };

            request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('kv', 'readwrite');
                tx.objectStore('kv').put(targetValue, targetKey);
                tx.oncomplete = () => {
                    db.close();
                    resolve();
                };
                tx.onerror = () => {
                    const err = tx.error;
                    db.close();
                    reject(err || new Error('IndexedDB write failed'));
                };
                tx.onabort = () => {
                    const err = tx.error;
                    db.close();
                    reject(err || new Error('IndexedDB write aborted'));
                };
            };
        });
    }, { targetKey: key, targetValue: value });
};

const dispatchPagehide = async (page, persisted) => {
    await page.evaluate((isPersisted) => {
        const event = new Event('pagehide');
        if (isPersisted) {
            Object.defineProperty(event, 'persisted', { value: true });
        }
        window.dispatchEvent(event);
    }, persisted);
};

const getProbe = async (page) =>
    page.evaluate(() => ({
        audioPlayCalls: window.__bfcacheProbe.audioPlayCalls,
        audioPauseCalls: window.__bfcacheProbe.audioPauseCalls,
        rtStartedEvents: window.__bfcacheProbe.rtStartedEvents,
        rtStoppedEvents: window.__bfcacheProbe.rtStoppedEvents,
    }));

test('session review recordings ignore persisted pagehide and stop on unload pagehide', async ({ page }) => {
    await installRealtimeAndAudioDoubles(page);
    await openHome(page);

    await seedKVValue(page, RECORDINGS_KEY, [SAMPLE_RECORDING]);
    await page.goto('/#view-analysis');
    await expect(page.locator('#view-analysis')).toBeVisible();

    const playButton = page.locator('#view-analysis .analysis-recording .recording-play').first();
    await expect(page.locator('#view-analysis [data-analysis=\"recording-title\"]').first()).toContainText('Session Clip');
    await expect.poll(async () => playButton.getAttribute('data-bound')).toBe('true');
    await expect(playButton).toHaveAttribute('data-recording-available', 'true');
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
});

test('parent recordings ignore persisted pagehide and stop on unload pagehide', async ({ page }) => {
    await installRealtimeAndAudioDoubles(page);
    await openHome(page);

    await seedKVValue(page, RECORDINGS_KEY, [SAMPLE_RECORDING]);
    await page.evaluate(() => {
        sessionStorage.setItem('panda-violin:parent-unlocked', 'true');
    });

    await page.goto('/#view-parent');
    await expect(page.locator('#view-parent')).toBeVisible();
    await expect(page.locator('#view-parent [data-parent-recordings] .recording-title').first()).toContainText('Session Clip');

    const playButton = page.locator('#view-parent [data-parent-recordings] .recording-play').first();
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
});
