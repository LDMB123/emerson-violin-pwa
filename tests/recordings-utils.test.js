import { describe, it, expect } from 'vitest';
import {
    getSongIdFromViewId,
    getSongIdFromHash,
    createBlobKey,
} from '../src/utils/recording-export.js';

describe('recordings-utils', () => {
    describe('getSongIdFromViewId', () => {
        it('strips view-song- prefix', () => {
            expect(getSongIdFromViewId('view-song-123')).toBe('123');
        });

        it('returns empty string for non-song view', () => {
            expect(getSongIdFromViewId('view-home')).toBe('');
        });

        it('returns empty string for null', () => {
            expect(getSongIdFromViewId(null)).toBe('');
        });

        it('returns empty string for undefined', () => {
            expect(getSongIdFromViewId(undefined)).toBe('');
        });
    });

    describe('getSongIdFromHash', () => {
        it('strips #view-song- prefix', () => {
            expect(getSongIdFromHash('#view-song-123')).toBe('123');
        });

        it('returns empty string for non-song hash', () => {
            expect(getSongIdFromHash('#view-home')).toBe('');
        });

        it('returns empty string for null', () => {
            expect(getSongIdFromHash(null)).toBe('');
        });

        it('returns empty string for empty string', () => {
            expect(getSongIdFromHash('')).toBe('');
        });
    });

    describe('createBlobKey', () => {
        it('creates key with recording prefix', () => {
            const key = createBlobKey('song-123');
            expect(key).toMatch(/^recording:song-123:/);
        });

        it('includes songId in key', () => {
            const key = createBlobKey('twinkle');
            expect(key).toContain('twinkle');
        });

        it('creates unique keys', () => {
            const key1 = createBlobKey('song-1');
            const key2 = createBlobKey('song-1');
            expect(key1).not.toBe(key2);
        });
    });

});
