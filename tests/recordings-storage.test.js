import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
    setJSON: vi.fn(async () => {}),
    setBlob: vi.fn(async () => true),
    removeBlob: vi.fn(async () => {}),
}));

const loaderMocks = vi.hoisted(() => ({
    loadRecordings: vi.fn(async () => []),
}));

const exportMocks = vi.hoisted(() => ({
    dataUrlToBlob: vi.fn(async () => new Blob()),
    blobToDataUrl: vi.fn(async () => 'data:audio/webm;base64,AAA'),
    createBlobKey: vi.fn((songId) => `blob:${songId}`),
}));

vi.mock('../src/persistence/storage.js', () => storageMocks);
vi.mock('../src/persistence/loaders.js', () => loaderMocks);
vi.mock('../src/utils/recording-export.js', () => exportMocks);

import { saveRecording } from '../src/recordings/recordings-storage.js';
import { RECORDINGS_KEY } from '../src/persistence/storage-keys.js';

describe('recordings-storage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('stores recordings with safe defaults when optional metadata is omitted', async () => {
        const blob = new Blob(['audio'], { type: 'audio/webm' });

        await saveRecording({
            songId: 'twinkle',
            duration: 12.2,
            blob,
        });

        expect(storageMocks.setBlob).toHaveBeenCalledWith('blob:twinkle', blob);
        expect(storageMocks.setJSON).toHaveBeenCalledWith(
            RECORDINGS_KEY,
            [
                expect.objectContaining({
                    id: 'twinkle',
                    title: 'twinkle',
                    duration: 12,
                    blobKey: 'blob:twinkle',
                    mimeType: 'audio/webm',
                }),
            ],
        );
    });

    it('supports the legacy positional saveRecording call shape', async () => {
        const blob = new Blob(['audio'], { type: 'audio/webm' });

        await saveRecording('mary', 8.8, blob);

        expect(storageMocks.setJSON).toHaveBeenCalledWith(
            RECORDINGS_KEY,
            [
                expect.objectContaining({
                    id: 'mary',
                    title: 'mary',
                    duration: 9,
                    blobKey: 'blob:mary',
                }),
            ],
        );
    });
});
