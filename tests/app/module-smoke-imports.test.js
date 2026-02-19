import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { MODULE_LOADERS } from '../../src/app/module-registry.js';

vi.mock('../../src/utils/dom-ready.js', () => ({
    whenReady: () => {},
}));

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const gameMetricsPath = path.join(repoRoot, 'src/games/game-metrics.js');
const gameMetricsSource = fs.readFileSync(gameMetricsPath, 'utf8');
const gameModuleImportSpecs = [
    ...new Set(
        [...gameMetricsSource.matchAll(/'([^']+)'\s*:\s*\(\)\s*=>\s*import\('([^']+)'\)/g)]
            .map((match) => match[2].replace('./', '../../src/games/'))
    ),
];

class MockIntersectionObserver {
    observe() {}

    unobserve() {}

    disconnect() {}
}

const installEnvironmentStubs = () => {
    document.body.innerHTML = `
        <dialog id="game-complete-modal">
            <span id="game-complete-score"></span>
            <span id="game-complete-accuracy"></span>
            <div id="game-complete-stars"><span class="game-complete-star"></span><span class="game-complete-star"></span><span class="game-complete-star"></span></div>
            <button id="game-complete-play-again" type="button"></button>
            <button id="game-complete-back" type="button"></button>
        </dialog>
    `;

    if (typeof window.matchMedia !== 'function') {
        window.matchMedia = vi.fn().mockImplementation(() => ({
            matches: false,
            media: '',
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        }));
    }

    if (typeof window.IntersectionObserver !== 'function') {
        window.IntersectionObserver = MockIntersectionObserver;
    }
    if (typeof globalThis.IntersectionObserver !== 'function') {
        globalThis.IntersectionObserver = MockIntersectionObserver;
    }

    if (typeof globalThis.Audio !== 'function') {
        globalThis.Audio = class MockAudio {
            constructor() {
                this.currentTime = 0;
                this.duration = 0;
                this.volume = 1;
                this.loop = false;
                this.paused = true;
                this.src = '';
            }

            play() {
                this.paused = false;
                return Promise.resolve();
            }

            pause() {
                this.paused = true;
            }

            addEventListener() {}

            removeEventListener() {}
        };
    }

    if (typeof window.requestAnimationFrame !== 'function') {
        window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 0);
    }
};

describe('module smoke imports', () => {
    it('imports every runtime and game module without throwing', async () => {
        installEnvironmentStubs();
        vi.useFakeTimers();

        const failures = [];

        for (const [moduleKey, loader] of Object.entries(MODULE_LOADERS)) {
            try {
                const loadedModule = await loader();
                expect(loadedModule).toBeTypeOf('object');
            } catch (error) {
                failures.push(`runtime:${moduleKey} -> ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        for (const importSpec of gameModuleImportSpecs) {
            try {
                const loadedModule = await import(importSpec);
                expect(loadedModule).toBeTypeOf('object');
            } catch (error) {
                failures.push(`game:${importSpec} -> ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        vi.clearAllTimers();
        vi.useRealTimers();

        expect(failures).toEqual([]);
    });
});
