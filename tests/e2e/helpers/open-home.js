import { expect } from '@playwright/test';
import { seedKVValue } from './seed-kv.js';
import { forceSoundsOn } from './sound-state.js';
import { navigateToPath } from './navigate-view.js';

export const openHome = async (page) => {
    // Mock navigator.permissions.query for Safari/WebKit tests to bypass explicit permission gates
    await page.addInitScript(() => {
        if (typeof window.MediaStream === 'undefined') {
            class FakeMediaStream {
                getTracks() { return []; }
                getAudioTracks() { return []; }
                getVideoTracks() { return []; }
            }

            Object.defineProperty(window, 'MediaStream', {
                value: FakeMediaStream,
                configurable: true,
            });
        }

        if (window.HTMLMediaElement) {
            const proto = window.HTMLMediaElement.prototype;
            const descriptor = Object.getOwnPropertyDescriptor(proto, 'srcObject');
            const srcObjectStore = new WeakMap();

            Object.defineProperty(proto, 'srcObject', {
                configurable: true,
                enumerable: descriptor?.enumerable ?? true,
                get() {
                    if (descriptor?.get) {
                        try {
                            return descriptor.get.call(this);
                        } catch {
                            return srcObjectStore.get(this) ?? null;
                        }
                    }
                    return srcObjectStore.get(this) ?? null;
                },
                set(value) {
                    if (descriptor?.set) {
                        try {
                            descriptor.set.call(this, value);
                            this.dataset.hasSrcObject = value ? 'true' : 'false';
                            return;
                        } catch {
                            // Fall back to a synthetic attachment in test browsers.
                        }
                    }
                    srcObjectStore.set(this, value ?? null);
                    this.dataset.hasSrcObject = value ? 'true' : 'false';
                },
            });
        }

        Object.defineProperty(navigator, 'permissions', {
            value: { query: () => Promise.resolve({ state: 'granted', onchange: null }) },
            configurable: true
        });

        if (!navigator.mediaDevices) {
            Object.defineProperty(navigator, 'mediaDevices', {
                value: {},
                configurable: true,
            });
        }

        navigator.mediaDevices.getUserMedia = async () => new MediaStream();

        if (window.HTMLDialogElement) {
            const proto = window.HTMLDialogElement.prototype;
            if (typeof proto.showModal !== 'function') {
                proto.showModal = function showModal() {
                    this.setAttribute('open', '');
                };
            }
            if (typeof proto.close !== 'function') {
                proto.close = function close() {
                    this.removeAttribute('open');
                };
            }
        }

        if (typeof window.MediaRecorder === 'undefined') {
            class FakeMediaRecorder extends EventTarget {
                static isTypeSupported() {
                    return true;
                }

                constructor(stream, options = {}) {
                    super();
                    this.stream = stream;
                    this.mimeType = options.mimeType || 'audio/webm';
                    this.state = 'inactive';
                }

                start() {
                    this.state = 'recording';
                }

                stop() {
                    if (this.state === 'inactive') return;
                    this.state = 'inactive';
                    const dataEvent = new Event('dataavailable');
                    dataEvent.data = new Blob(['panda-test-recording'], { type: this.mimeType });
                    this.dispatchEvent(dataEvent);
                    this.dispatchEvent(new Event('stop'));
                }
            }

            Object.defineProperty(window, 'MediaRecorder', {
                value: FakeMediaRecorder,
                configurable: true,
            });
        }
    });

    // Navigate home natively
    await page.goto('/', { waitUntil: 'commit' }).catch(() => { });

    // Wipe local caches but immediately force onboarding flags to prevent React intercept
    await page.evaluate(() => {
        try {
            localStorage.clear();
            sessionStorage.clear();
            localStorage.setItem('onboarding-complete', 'true');
            localStorage.setItem('e2e-skip-permissions', 'true');
        } catch (e) { }
    });

    const uiState = {
        checks: { 'setting-sounds': true },
        radios: {},
    };
    await seedKVValue(page, 'panda-violin:ui-state:v1', uiState).catch(() => { });

    await forceSoundsOn(page);

    // Hard reload the browser context to ensure AppShell reads the populated storage flags
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => { });
    await navigateToPath(page, '/home');
    await expect(page.locator('#view-home')).toBeVisible({ timeout: 10000 });
    await page.waitForSelector('#main-content', { timeout: 10000 });
};
