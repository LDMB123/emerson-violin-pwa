import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    complete: null,
}));

vi.mock('../../src/persistence/storage.js', () => ({
    getJSON: vi.fn(async () => state.complete),
}));

import { shouldShowOnboarding } from '../../src/onboarding/onboarding-check.js';

describe('onboarding-check', () => {
    beforeEach(() => {
        state.complete = null;
    });

    it('shows onboarding when state is missing', async () => {
        state.complete = null;
        await expect(shouldShowOnboarding()).resolves.toBe(true);
    });

    it('shows onboarding when state is false', async () => {
        state.complete = false;
        await expect(shouldShowOnboarding()).resolves.toBe(true);
    });

    it('hides onboarding when state is true', async () => {
        state.complete = true;
        await expect(shouldShowOnboarding()).resolves.toBe(false);
    });
});
