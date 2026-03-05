import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSON_STEP, PRACTICE_RECORDED } from '../../src/utils/event-names.js';
import { setupModuleImportDomTest, teardownModuleImportDomTest } from '../utils/test-listener-capture.js';
import { setDocumentVisibility } from '../utils/test-lifecycle-mocks.js';

const storageMocks = vi.hoisted(() => ({
    getJSON: vi.fn(async () => null),
}));

vi.mock('../../src/persistence/storage.js', () => storageMocks);

describe('notifications/badging', () => {
    let captures;
    let setAppBadge;
    let clearAppBadge;

    beforeEach(() => {
        captures = setupModuleImportDomTest({
            setupState: () => {
                vi.setSystemTime(new Date('2026-03-05T12:00:00.000Z'));
                setDocumentVisibility('visible');
            },
        });
        storageMocks.getJSON.mockReset();
        storageMocks.getJSON.mockResolvedValue(null);
        setAppBadge = vi.fn().mockResolvedValue(undefined);
        clearAppBadge = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'setAppBadge', {
            configurable: true,
            value: setAppBadge,
        });
        Object.defineProperty(navigator, 'clearAppBadge', {
            configurable: true,
            value: clearAppBadge,
        });
    });

    afterEach(() => {
        teardownModuleImportDomTest(captures);
    });

    it('clears the badge on visible boot and sets it when hidden without practice', async () => {
        await import('../../src/notifications/badging.js');
        await Promise.resolve();

        expect(clearAppBadge).toHaveBeenCalledTimes(1);
        expect(setAppBadge).not.toHaveBeenCalled();

        setDocumentVisibility('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        await Promise.resolve();

        expect(storageMocks.getJSON).toHaveBeenCalledTimes(1);
        expect(setAppBadge).toHaveBeenCalledWith(1);
    });

    it('refreshes the badge for practice and lesson events', async () => {
        storageMocks.getJSON.mockResolvedValue({
            days: [{ date: '2026-03-05', totalTime: 12 }],
        });

        await import('../../src/notifications/badging.js');
        await Promise.resolve();
        clearAppBadge.mockClear();

        document.dispatchEvent(new Event(PRACTICE_RECORDED));
        await Promise.resolve();
        document.dispatchEvent(new Event(LESSON_STEP));
        await Promise.resolve();

        expect(storageMocks.getJSON).toHaveBeenCalledTimes(2);
        expect(setAppBadge).not.toHaveBeenCalled();
        expect(clearAppBadge).toHaveBeenCalledTimes(2);
    });
});
