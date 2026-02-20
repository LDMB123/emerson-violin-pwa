import { describe, expect, it } from 'vitest';
import {
    hasE2ERealtimeHooks,
    hasE2ERealtimeStartSimulation,
} from '../../src/realtime/session-test-flags.js';

describe('session-test-flags', () => {
    it('enables hooks only for localhost with explicit flag', () => {
        const localhostWindow = {
            location: { hostname: 'localhost' },
            __PANDA_E2E_HOOKS__: true,
        };
        const remoteWindow = {
            location: { hostname: 'example.com' },
            __PANDA_E2E_HOOKS__: true,
        };

        expect(hasE2ERealtimeHooks(localhostWindow)).toBe(true);
        expect(hasE2ERealtimeHooks(remoteWindow)).toBe(false);
    });

    it('enables start simulation only for localhost with explicit flag', () => {
        const localhostWindow = {
            location: { hostname: '127.0.0.1' },
            __PANDA_E2E_RT_SIMULATE_START__: true,
        };
        const remoteWindow = {
            location: { hostname: 'panda-violin.app' },
            __PANDA_E2E_RT_SIMULATE_START__: true,
        };

        expect(hasE2ERealtimeStartSimulation(localhostWindow)).toBe(true);
        expect(hasE2ERealtimeStartSimulation(remoteWindow)).toBe(false);
    });
});
