import { describe, expect, it, vi } from 'vitest';
import { MODULE_LOADERS } from '../../src/app/module-registry.js';
import {
    gameModuleImportSpecs,
    installAudioStub,
    installGameCompleteModalDom,
    installIntersectionObserverStub,
    installMatchMediaStub,
    installRequestAnimationFrameStub,
    loadObjectModuleOrRecordFailure,
} from './module-test-helpers.js';

vi.mock('../../src/utils/dom-ready.js', () => ({
    whenReady: () => {},
}));

const installEnvironmentStubs = () => {
    installGameCompleteModalDom();
    installMatchMediaStub({ onlyIfMissing: true });
    installIntersectionObserverStub({ onlyIfMissing: true });
    installAudioStub({ onlyIfMissing: true });
    installRequestAnimationFrameStub({ onlyIfMissing: true });
};

describe('module smoke imports', () => {
    it('imports every runtime and game module without throwing', async () => {
        installEnvironmentStubs();
        vi.useFakeTimers();

        const failures = [];

        for (const [moduleKey, loader] of Object.entries(MODULE_LOADERS)) {
            await loadObjectModuleOrRecordFailure({
                failures,
                label: `runtime:${moduleKey}`,
                load: loader,
            });
        }

        for (const importSpec of gameModuleImportSpecs) {
            await loadObjectModuleOrRecordFailure({
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
