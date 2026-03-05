import { describe, expect, it, vi } from 'vitest';
import { MODULE_LOADERS } from '../../src/app/module-registry.js';
import {
    gameModuleImportSpecs,
    installAudioStub,
    installGameCompleteModalDom,
    installMatchMediaStub,
    installRequestAnimationFrameStub,
    loadModuleOrRecordFailure,
    MockIntersectionObserver,
} from './module-test-helpers.js';

vi.mock('../../src/utils/dom-ready.js', () => ({
    whenReady: () => {},
}));

const installEnvironmentStubs = () => {
    installGameCompleteModalDom();
    installMatchMediaStub({ onlyIfMissing: true });

    if (typeof window.IntersectionObserver !== 'function') {
        window.IntersectionObserver = MockIntersectionObserver;
    }
    if (typeof globalThis.IntersectionObserver !== 'function') {
        globalThis.IntersectionObserver = MockIntersectionObserver;
    }

    installAudioStub({ onlyIfMissing: true });
    installRequestAnimationFrameStub({ onlyIfMissing: true });
};

const assertLoadableObjectModule = async ({ failures, label, load }) => {
    const loadedModule = await loadModuleOrRecordFailure({
        failures,
        label,
        load,
    });
    if (!loadedModule) return;
    expect(loadedModule).toBeTypeOf('object');
};

describe('module smoke imports', () => {
    it('imports every runtime and game module without throwing', async () => {
        installEnvironmentStubs();
        vi.useFakeTimers();

        const failures = [];

        for (const [moduleKey, loader] of Object.entries(MODULE_LOADERS)) {
            await assertLoadableObjectModule({
                failures,
                label: `runtime:${moduleKey}`,
                load: loader,
            });
        }

        for (const importSpec of gameModuleImportSpecs) {
            await assertLoadableObjectModule({
                failures,
                label: `game:${importSpec}`,
                load: () => import(importSpec),
            });
        }

        vi.clearAllTimers();
        vi.useRealTimers();

        expect(failures).toEqual([]);
    });
});
