import { describe, it, expect } from 'vitest';
import { hasServiceWorkerSupport, canRegisterServiceWorker } from '../src/platform/sw-support.js';

describe('hasServiceWorkerSupport', () => {
    it('returns true when serviceWorker exists', () => {
        expect(hasServiceWorkerSupport({ serviceWorker: {} })).toBe(true);
    });

    it('returns false when serviceWorker is missing', () => {
        expect(hasServiceWorkerSupport({})).toBe(false);
        expect(hasServiceWorkerSupport(null)).toBe(false);
    });
});

describe('canRegisterServiceWorker', () => {
    const supportedNavigator = { serviceWorker: {} };

    it('returns true on secure contexts with support', () => {
        const allowed = canRegisterServiceWorker(supportedNavigator, { hostname: 'example.com' }, true);
        expect(allowed).toBe(true);
    });

    it('returns true for localhost-style hosts with support', () => {
        expect(canRegisterServiceWorker(supportedNavigator, { hostname: 'localhost' }, false)).toBe(true);
        expect(canRegisterServiceWorker(supportedNavigator, { hostname: '127.0.0.1' }, false)).toBe(true);
        expect(canRegisterServiceWorker(supportedNavigator, { hostname: 'devbox.local' }, false)).toBe(true);
    });

    it('returns false for insecure non-local hosts', () => {
        const allowed = canRegisterServiceWorker(supportedNavigator, { hostname: 'example.com' }, false);
        expect(allowed).toBe(false);
    });

    it('returns false when service worker is not supported', () => {
        const allowed = canRegisterServiceWorker({}, { hostname: 'localhost' }, true);
        expect(allowed).toBe(false);
    });
});
