import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getSongIdFromViewId,
    getSongIdFromHash,
    createBlobKey,
    isRecordingKey,
    extractRecordingMetadata,
    validateRecording,
    filterValidRecordings,
    limitRecordings,
    pruneOldRecordings,
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

    describe('isRecordingKey', () => {
        it('returns true for recording keys', () => {
            expect(isRecordingKey('recording:song-123:abc')).toBe(true);
        });

        it('returns false for non-recording keys', () => {
            expect(isRecordingKey('other:key')).toBe(false);
        });

        it('returns false for null', () => {
            expect(isRecordingKey(null)).toBe(false);
        });

        it('returns false for non-string', () => {
            expect(isRecordingKey(123)).toBe(false);
        });
    });

    describe('extractRecordingMetadata', () => {
        it('extracts metadata from recording', () => {
            const recording = {
                title: 'My Song',
                duration: 120,
                timestamp: 1000000,
                songId: 'twinkle',
            };
            const result = extractRecordingMetadata(recording);
            expect(result.title).toBe('My Song');
            expect(result.duration).toBe(120);
            expect(result.timestamp).toBe(1000000);
            expect(result.songId).toBe('twinkle');
        });

        it('provides defaults for missing fields', () => {
            const result = extractRecordingMetadata({});
            expect(result.title).toBe('Practice Clip');
            expect(result.duration).toBe(0);
            expect(result.timestamp).toBeGreaterThan(0);
            expect(result.songId).toBe('');
        });

        it('handles null recording', () => {
            const result = extractRecordingMetadata(null);
            expect(result.title).toBe('Practice Clip');
        });
    });

    describe('validateRecording', () => {
        it('returns true for recording with dataUrl', () => {
            expect(validateRecording({ dataUrl: 'data:...' })).toBe(true);
        });

        it('returns true for recording with blobKey', () => {
            expect(validateRecording({ blobKey: 'recording:123' })).toBe(true);
        });

        it('returns false for recording without dataUrl or blobKey', () => {
            expect(validateRecording({ title: 'Test' })).toBe(false);
        });

        it('returns false for null', () => {
            expect(validateRecording(null)).toBe(false);
        });

        it('returns false for empty object', () => {
            expect(validateRecording({})).toBe(false);
        });
    });

    describe('filterValidRecordings', () => {
        it('filters out invalid recordings', () => {
            const recordings = [
                { dataUrl: 'data:...' },
                { title: 'Invalid' },
                { blobKey: 'recording:123' },
            ];
            const result = filterValidRecordings(recordings);
            expect(result).toHaveLength(2);
        });

        it('returns empty array for empty input', () => {
            expect(filterValidRecordings([])).toEqual([]);
        });

        it('returns empty array for non-array', () => {
            expect(filterValidRecordings(null)).toEqual([]);
        });
    });

    describe('limitRecordings', () => {
        it('limits to default max count', () => {
            const recordings = Array.from({ length: 10 }, () => ({ dataUrl: 'data:...' }));
            const result = limitRecordings(recordings);
            expect(result).toHaveLength(4);
        });

        it('respects custom max count', () => {
            const recordings = Array.from({ length: 10 }, () => ({ dataUrl: 'data:...' }));
            const result = limitRecordings(recordings, 2);
            expect(result).toHaveLength(2);
        });

        it('returns all recordings if under limit', () => {
            const recordings = [{ dataUrl: 'data:...' }];
            const result = limitRecordings(recordings);
            expect(result).toHaveLength(1);
        });
    });

    describe('pruneOldRecordings', () => {
        it('keeps newest recordings', () => {
            const recordings = [
                { dataUrl: 'data:...', timestamp: 1000 },
                { dataUrl: 'data:...', timestamp: 3000 },
                { dataUrl: 'data:...', timestamp: 2000 },
            ];
            const result = pruneOldRecordings(recordings, 2);
            expect(result).toHaveLength(2);
            expect(result[0].timestamp).toBe(3000);
            expect(result[1].timestamp).toBe(2000);
        });

        it('returns all if under limit', () => {
            const recordings = [
                { dataUrl: 'data:...', timestamp: 1000 },
                { dataUrl: 'data:...', timestamp: 2000 },
            ];
            const result = pruneOldRecordings(recordings, 4);
            expect(result).toHaveLength(2);
        });

        it('handles missing timestamps', () => {
            const recordings = [
                { dataUrl: 'data:...' },
                { dataUrl: 'data:...', timestamp: 2000 },
            ];
            const result = pruneOldRecordings(recordings, 1);
            expect(result).toHaveLength(1);
            expect(result[0].timestamp).toBe(2000);
        });
    });
});
