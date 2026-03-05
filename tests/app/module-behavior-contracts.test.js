import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODULE_LOADERS } from '../../src/app/module-registry.js';
import {
    gameModuleRows,
    GAME_COMPLETE_MODAL_HTML,
    installAudioStub,
    installMatchMediaStub,
    installRequestAnimationFrameStub,
    loadModuleOrRecordFailure,
    MockIntersectionObserver,
} from './module-test-helpers.js';

vi.mock('../../src/utils/dom-ready.js', () => ({
    whenReady: (callback) => {
        if (typeof callback !== 'function') return;
        try {
            const result = callback();
            if (result && typeof result.catch === 'function') {
                result.catch(() => undefined);
            }
        } catch {
            // Swallow startup probe failures inside behavior-contract tests.
        }
    },
}));

vi.mock('../../src/wasm/load-core.js', () => {
    const SkillCategory = Object.freeze({
        Pitch: 'pitch',
        Rhythm: 'rhythm',
        BowControl: 'bow_control',
        Posture: 'posture',
        Reading: 'reading',
    });

    class SkillProfile {
        constructor() {
            this.pitch = 50;
            this.rhythm = 50;
            this.bow_control = 50;
            this.posture = 50;
            this.reading = 50;
        }

        update_skill(category, score) {
            if (typeof category !== 'string') return;
            const value = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
            if (Object.values(SkillCategory).includes(category)) {
                this[category] = value;
            }
        }

        weakest_skill() {
            const values = [
                ['pitch', this.pitch],
                ['rhythm', this.rhythm],
                ['bow_control', this.bow_control],
                ['posture', this.posture],
                ['reading', this.reading],
            ];
            values.sort((left, right) => left[1] - right[1]);
            return values[0]?.[0] || 'pitch';
        }
    }

    class PlayerProgress {
        constructor() {
            this.level = 1;
            this.xp = 0;
        }

        #recomputeLevel() {
            const levelSize = 120;
            this.level = Math.max(1, Math.floor(this.xp / levelSize) + 1);
        }

        log_practice(minutes = 0) {
            this.xp += Math.max(0, Math.round(minutes * 5));
            this.#recomputeLevel();
        }

        log_game_score(_id, score = 0) {
            this.xp += Math.max(0, Math.round((Number(score) || 0) * 0.2));
            this.#recomputeLevel();
        }

        log_song_complete(score = 0) {
            this.xp += Math.max(0, Math.round((Number(score) || 0) * 0.15));
            this.#recomputeLevel();
        }

        xp_to_next_level() {
            const levelSize = 120;
            const nextLevelXp = this.level * levelSize;
            return Math.max(0, nextLevelXp - this.xp);
        }

        level_progress() {
            const levelSize = 120;
            const previousLevelXp = (this.level - 1) * levelSize;
            const progress = ((this.xp - previousLevelXp) / levelSize) * 100;
            return Math.max(0, Math.min(100, Math.round(progress)));
        }
    }

    class AchievementTracker {
        #unlocked = new Set();

        unlock(id) {
            if (id) this.#unlocked.add(id);
        }

        is_unlocked(id) {
            return this.#unlocked.has(id);
        }

        check_progress() {
            return undefined;
        }
    }

    const calculate_streak = (days) => {
        const unique = [...new Set(Array.from(days || []).map((v) => Number(v)).filter((v) => Number.isFinite(v)))];
        const values = unique.sort((left, right) => left - right);
        if (!values.length) return 0;
        let streak = 1;
        for (let i = values.length - 2; i >= 0; i -= 1) {
            if (values[i + 1] - values[i] === 1) { streak += 1; }
            else { break; }
        }
        return streak;
    };

    return {
        getCore: async () => ({
            PlayerProgress,
            AchievementTracker,
            SkillProfile,
            SkillCategory,
            calculate_streak,
        }),
    };
});

class MockMutationObserver {
    constructor(callback = () => {}) {
        this.callback = callback;
    }

    observe() {
        return undefined;
    }

    disconnect() {
        return undefined;
    }

    takeRecords() {
        return [];
    }
}

const ensureMatchMedia = () => installMatchMediaStub({
    matchesResolver: (query) => query === '(prefers-reduced-data: reduce)',
});

const ensureAudio = () => installAudioStub();

const ensureServiceWorker = () => {
    const registration = {
        update: vi.fn().mockResolvedValue(undefined),
        waiting: null,
        installing: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    };
    const serviceWorker = {
        controller: { postMessage: vi.fn() },
        ready: Promise.resolve(registration),
        getRegistration: vi.fn().mockResolvedValue(registration),
        getRegistrations: vi.fn().mockResolvedValue([registration]),
        register: vi.fn().mockResolvedValue(registration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    };

    Object.defineProperty(window.navigator, 'serviceWorker', {
        configurable: true,
        value: serviceWorker,
    });
};

const ensureNavigatorCapabilities = () => {
    Object.defineProperty(window.navigator, 'setAppBadge', {
        configurable: true,
        value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(window.navigator, 'clearAppBadge', {
        configurable: true,
        value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(window.navigator, 'deviceMemory', {
        configurable: true,
        value: 4,
    });
    Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: true,
    });
    Object.defineProperty(window.navigator, 'storage', {
        configurable: true,
        value: {
            persisted: vi.fn().mockResolvedValue(false),
            persist: vi.fn().mockResolvedValue(true),
            estimate: vi.fn().mockResolvedValue({ quota: 1024 * 1024 * 1024, usage: 1024 }),
        },
    });
};

const ensureNotification = () => {
    globalThis.Notification = class MockNotification {
        static permission = 'granted';

        static requestPermission() {
            return Promise.resolve('granted');
        }
    };
};

const ensureCaches = () => {
    const cache = {
        keys: vi.fn().mockResolvedValue([]),
        match: vi.fn().mockResolvedValue(null),
    };
    globalThis.caches = {
        keys: vi.fn().mockResolvedValue(['panda-violin-local-v1']),
        open: vi.fn().mockResolvedValue(cache),
    };
};

const ensureFetch = () => {
    const textResponse = () => new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
    globalThis.fetch = vi.fn().mockImplementation((resource) => {
        const url = String(resource || '');
        if (url.includes('panda_core_bg.wasm')) {
            return Promise.resolve(new Response(new Uint8Array([0, 97, 115, 109]), {
                status: 200,
                headers: { 'Content-Type': 'application/wasm' },
            }));
        }
        return Promise.resolve(textResponse());
    });
};

const installBaseDom = () => {
    document.body.innerHTML = `
        <button data-parent-lock type="button"></button>
        <button data-install-help type="button"></button>
        <div id="install-toast" hidden>
            <button data-install-toast-action type="button">Install</button>
            <button class="install-toast-close" type="button">Close</button>
        </div>
        <div class="audio-card">
            <span class="audio-label">A</span>
            <audio controls preload="auto"></audio>
        </div>
        <div id="view-onboarding">
            <div id="onboarding-carousel">
                <article id="onboarding-slide-1" class="onboarding-slide"></article>
            </div>
            <button class="onboarding-dot is-active" data-slide="1" type="button"></button>
            <button id="onboarding-start" type="button">Start</button>
            <button id="onboarding-skip" type="button">Skip</button>
        </div>
        <dialog id="parent-pin-dialog" data-pin-dialog>
            <form method="dialog">
                <input id="parent-pin-input" />
                <button value="submit" type="submit">Submit</button>
                <button value="cancel" type="submit">Cancel</button>
            </form>
        </dialog>
        <span data-parent-pin-display></span>
        <input data-parent-pin-input />
        <span data-parent-pin-status></span>
        ${GAME_COMPLETE_MODAL_HTML}
    `;

    gameModuleRows.forEach(({ viewId }) => {
        const stage = document.createElement('section');
        stage.id = viewId;
        stage.className = 'game-view';
        stage.innerHTML = `
            <header class="game-header"><span class="game-score">Guided Drill</span></header>
            <div class="game-content"></div>
        `;
        document.body.appendChild(stage);
    });

    const stringQuestStage = document.getElementById('view-game-string-quest');
    if (stringQuestStage) {
        stringQuestStage.innerHTML = `
            <header class="game-header"><span class="game-score">Guided Drill</span></header>
            <div class="game-content">
                <p data-string="prompt"></p>
                <p data-string="sequence"></p>
                <p data-string="score">0</p>
                <p data-string="combo">x0</p>
                <button class="string-btn" data-string-btn="G" type="button">G</button>
                <button class="string-btn" data-string-btn="D" type="button">D</button>
                <button class="string-btn" data-string-btn="A" type="button">A</button>
                <button class="string-btn" data-string-btn="E" type="button">E</button>
                <span data-string-target="G"></span>
                <span data-string-target="D"></span>
                <span data-string-target="A"></span>
                <span data-string-target="E"></span>
            </div>
        `;
    }
};

const installEnvironment = () => {
    installBaseDom();
    ensureMatchMedia();
    ensureAudio();
    ensureServiceWorker();
    ensureNavigatorCapabilities();
    ensureNotification();
    ensureCaches();
    ensureFetch();
    window.IntersectionObserver = MockIntersectionObserver;
    globalThis.IntersectionObserver = MockIntersectionObserver;
    window.MutationObserver = MockMutationObserver;
    globalThis.MutationObserver = MockMutationObserver;
    installRequestAnimationFrameStub();
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => undefined);
    if (typeof HTMLDialogElement !== 'undefined') {
        HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.showModal || (() => undefined);
        HTMLDialogElement.prototype.close = HTMLDialogElement.prototype.close || (() => undefined);
    }
};

const invokeMaybeAsync = async (callback) => {
    if (typeof callback !== 'function') return;
    await Promise.resolve(callback());
};

beforeEach(() => {
    vi.useFakeTimers();
    installEnvironment();
});

afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
});

describe('module behavior contracts', () => {
    it('runs behavior probes for every runtime module', async () => {
        const failures = [];

        for (const [moduleKey, loader] of Object.entries(MODULE_LOADERS)) {
            const loadedModule = await loadModuleOrRecordFailure({
                failures,
                label: `runtime:${moduleKey}`,
                load: loader,
            });
            if (!loadedModule) continue;
            expect(loadedModule).toBeTypeOf('object');

            if (moduleKey !== 'progress') {
                await invokeMaybeAsync(loadedModule.init);
            }
            if (moduleKey === 'progress') {
                const probe = document.createElement('input');
                probe.id = 'progress-branch-probe';
                probe.type = 'checkbox';
                probe.checked = false;
                document.body.appendChild(probe);
                probe.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (moduleKey === 'badging' && typeof loadedModule.setBadge === 'function') {
                await loadedModule.setBadge(0);
            }
            if (moduleKey === 'audioPlayer') {
                expect(document.querySelector('.audio-card .tone-play-btn')).not.toBeNull();
            }
            if (moduleKey === 'dataSaver') {
                const audio = document.querySelector('.audio-card audio');
                expect(audio?.getAttribute('preload')).toBe('none');
            }
            if (moduleKey === 'gameEnhancements') {
                expect(document.querySelector('.game-view[data-game-enhanced="true"]')).not.toBeNull();
            }
        }

        await vi.advanceTimersByTimeAsync(1000);
        expect(failures).toEqual([]);
    });

    it('runs behavior probes for every game module', async () => {
        const failures = [];

        for (const { viewId, importSpec } of gameModuleRows) {
            const loadedModule = await loadModuleOrRecordFailure({
                failures,
                label: `game:${viewId} (${importSpec})`,
                load: () => import(importSpec),
            });
            if (!loadedModule) continue;
            expect(loadedModule).toBeTypeOf('object');
            expect(typeof loadedModule.bind).toBe('function');
            expect(typeof loadedModule.update).toBe('function');

            window.location.hash = `#${viewId}`;
            await invokeMaybeAsync(() => loadedModule.bind({ speed: 1, complexity: 1 }));
            if (viewId === 'view-game-string-quest') {
                const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
                await invokeMaybeAsync(() => loadedModule.bind({ speed: 1, complexity: 1 }));
                const trigger = document.querySelector('#view-game-string-quest .string-btn[data-string-btn="G"]');
                trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
                randomSpy.mockRestore();
            }
            await invokeMaybeAsync(loadedModule.update);
        }

        await vi.advanceTimersByTimeAsync(500);
        expect(failures).toEqual([]);
    });

    it('covers sequence-wrapper callback branches', async () => {
        vi.resetModules();
        const marks = [];

        vi.doMock('../../src/games/sequence-game.js', () => ({
            createSequenceGame: (config) => {
                if (config.id === 'string-quest') {
                    const stringState = {
                        lastCorrectNote: null,
                        markChecklist: (id) => marks.push(id),
                    };
                    config.onCorrectHit('G', stringState);
                    stringState.lastCorrectNote = 'D';
                    config.onCorrectHit('A', stringState);
                }
                if (config.id === 'pizzicato') {
                    const pizzicatoState = {
                        hitNotes: new Set(),
                        markChecklistIf: (condition, id) => {
                            if (condition) marks.push(id);
                        },
                    };
                    config.onCorrectHit('G', pizzicatoState);
                    config.onCorrectHit('D', pizzicatoState);
                    config.onCorrectHit('A', pizzicatoState);
                    config.onCorrectHit('E', pizzicatoState);
                }
                return {
                    bind: () => undefined,
                    update: () => undefined,
                };
            },
        }));

        const stringQuest = await import('../../src/games/string-quest.js');
        const pizzicato = await import('../../src/games/pizzicato.js');
        expect(typeof stringQuest.bind).toBe('function');
        expect(typeof stringQuest.update).toBe('function');
        expect(typeof pizzicato.bind).toBe('function');
        expect(typeof pizzicato.update).toBe('function');
        expect(marks).toContain('sq-step-1');
        expect(marks).toContain('sq-step-2');
        expect(marks).toContain('pz-step-1');
        vi.doUnmock('../../src/games/sequence-game.js');
    });
});
