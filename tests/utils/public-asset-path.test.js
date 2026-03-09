import { describe, expect, it } from 'vitest';

import { getPublicAssetPath } from '../../src/utils/public-asset-path.js';

describe('getPublicAssetPath', () => {
    it('prepends the configured base path for relative public assets', () => {
        expect(getPublicAssetPath('./assets/icons/icon-192.png', '/emerson-violin-pwa/')).toBe('/emerson-violin-pwa/assets/icons/icon-192.png');
        expect(getPublicAssetPath('assets/icons/icon-192.png', '/emerson-violin-pwa/')).toBe('/emerson-violin-pwa/assets/icons/icon-192.png');
    });

    it('leaves root-resolved assets unchanged when the base is root', () => {
        expect(getPublicAssetPath('/assets/icons/icon-192.png', '/')).toBe('/assets/icons/icon-192.png');
    });

    it('does not rewrite external or inline URLs', () => {
        expect(getPublicAssetPath('https://example.com/icon.png', '/emerson-violin-pwa/')).toBe('https://example.com/icon.png');
        expect(getPublicAssetPath('data:image/png;base64,abc', '/emerson-violin-pwa/')).toBe('data:image/png;base64,abc');
    });
});
