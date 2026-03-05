import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const gameMetricsPath = path.join(repoRoot, 'src/games/game-metrics.js');
const gameMetricsSource = fs.readFileSync(gameMetricsPath, 'utf8');

export const gameModuleRows = [
    ...new Map(
        [...gameMetricsSource.matchAll(/'([^']+)'\s*:\s*\(\)\s*=>\s*import\('([^']+)'\)/g)].map((match) => [
            match[1],
            match[2].replace('./', '../../src/games/'),
        ])
    ).entries(),
].map(([viewId, importSpec]) => ({ viewId, importSpec }));

export const gameModuleImportSpecs = [...new Set(gameModuleRows.map(({ importSpec }) => importSpec))];

export class MockIntersectionObserver {
    observe() {
        return undefined;
    }

    unobserve() {
        return undefined;
    }

    disconnect() {
        return undefined;
    }
}

export class MockAudio {
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

    addEventListener() {
        return undefined;
    }

    removeEventListener() {
        return undefined;
    }
}

export const installMatchMediaStub = ({
    onlyIfMissing = false,
    matchesResolver = null,
} = {}) => {
    if (onlyIfMissing && typeof window.matchMedia === 'function') return;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: typeof matchesResolver === 'function' ? Boolean(matchesResolver(query)) : false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
    }));
};

export const installAudioStub = ({ onlyIfMissing = false } = {}) => {
    if (onlyIfMissing && typeof globalThis.Audio === 'function') return;
    globalThis.Audio = MockAudio;
};

export const installRequestAnimationFrameStub = ({ onlyIfMissing = false } = {}) => {
    if (onlyIfMissing && typeof window.requestAnimationFrame === 'function') return;
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 0);
};

export const GAME_COMPLETE_MODAL_HTML = `
    <dialog id="game-complete-modal">
        <span id="game-complete-score"></span>
        <span id="game-complete-accuracy"></span>
        <div id="game-complete-stars">
            <span class="game-complete-star"></span>
            <span class="game-complete-star"></span>
            <span class="game-complete-star"></span>
        </div>
        <button id="game-complete-play-again" type="button"></button>
        <button id="game-complete-back" type="button"></button>
    </dialog>
`;

export const installGameCompleteModalDom = () => {
    document.body.innerHTML = GAME_COMPLETE_MODAL_HTML;
};

export const toErrorMessage = (error) => (error instanceof Error ? error.message : String(error));

export const loadModuleOrRecordFailure = async ({
    failures = [],
    label = '',
    load = null,
} = {}) => {
    if (typeof load !== 'function') return null;
    try {
        return await load();
    } catch (error) {
        failures.push(`${label} -> ${toErrorMessage(error)}`);
        return null;
    }
};
