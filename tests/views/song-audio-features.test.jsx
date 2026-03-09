import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const songLibraryMocks = vi.hoisted(() => ({
    getSongById: vi.fn(async (songId) => ({
        id: songId,
        title: 'Twinkle',
        bpm: 80,
        tier: 'practice',
        sections: [],
    })),
}));

const persistenceMocks = vi.hoisted(() => ({
    loadRecordings: vi.fn(async () => []),
}));

const progressSummaryMocks = vi.hoisted(() => ({
    useProgressSummary: vi.fn(() => ({ summary: { songScores: {} } })),
}));

const tapTempoMocks = vi.hoisted(() => ({
    useTapTempo: vi.fn(() => ({
        bpmOverride: null,
        handleTap: vi.fn(),
        reset: vi.fn(),
    })),
}));

const permissionGateMocks = vi.hoisted(() => ({
    PermissionGate: vi.fn(({ required, children }) => (
        <div data-testid="permission-gate" data-required={String(required)}>
            {children}
        </div>
    )),
}));

const nativeSongPlayerMocks = vi.hoisted(() => ({
    useNativeSongPlayer: vi.fn(() => ({
        status: 'Ready',
        currentNote: null,
    })),
}));

const mediaRecorderMocks = vi.hoisted(() => ({
    useMediaRecorder: vi.fn(() => ({
        isRecording: false,
        durationSecs: 0,
        error: null,
        startRecording: vi.fn(async () => true),
        stopRecording: vi.fn(async () => true),
    })),
}));

const progressionMocks = vi.hoisted(() => ({
    getSongCheckpoint: vi.fn(async () => null),
    saveSongCheckpoint: vi.fn(async () => {}),
}));

const playbackUtilsMocks = vi.hoisted(() => ({
    playRecordingWithSoundCheck: vi.fn(async () => true),
}));

const audioUtilsMocks = vi.hoisted(() => ({
    createAudioController: vi.fn(() => ({
        audio: {
            onended: null,
        },
        stop: vi.fn(),
        playSource: vi.fn(async () => {}),
    })),
}));

vi.mock('../../src/songs/song-library.js', () => songLibraryMocks);
vi.mock('../../src/persistence/loaders.js', () => persistenceMocks);
vi.mock('../../src/hooks/useProgressSummary.js', () => progressSummaryMocks);
vi.mock('../../src/hooks/useTapTempo.js', () => tapTempoMocks);
vi.mock('../../src/components/shared/PermissionGate.jsx', () => permissionGateMocks);
vi.mock('../../src/hooks/useNativeSongPlayer.js', () => nativeSongPlayerMocks);
vi.mock('../../src/hooks/useMediaRecorder.js', () => mediaRecorderMocks);
vi.mock('../../src/songs/song-progression.js', () => progressionMocks);
vi.mock('../../src/utils/recording-playback-utils.js', () => playbackUtilsMocks);
vi.mock('../../src/utils/audio-utils.js', () => audioUtilsMocks);

import { SongRunnerView } from '../../src/views/Songs/SongRunnerView.jsx';
import { SongDetailView } from '../../src/views/Songs/SongDetailView.jsx';

const renderSongRunner = (initialEntry) => render(
    <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
            <Route path="/songs/:songId/play" element={<SongRunnerView />} />
        </Routes>
    </MemoryRouter>,
);

const renderSongDetail = (initialEntry = '/songs/twinkle') => render(
    <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
            <Route path="/songs/:songId" element={<SongDetailView />} />
        </Routes>
    </MemoryRouter>,
);

describe('song audio features', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn(async () => ({
            ok: true,
            text: async () => '<div class="song-sheet"><div class="song-note"><span class="song-note-pitch">A4</span></div></div>',
        }));
    });

    it('does not require microphone permission for normal song playback and fetches the public song asset path', async () => {
        renderSongRunner('/songs/twinkle/play');

        await screen.findByText('Twinkle');
        expect(screen.getByTestId('permission-gate')).toHaveAttribute('data-required', 'false');
        expect(global.fetch).toHaveBeenCalledWith('/views/songs/twinkle.html');
    });

    it('requires microphone permission for record intent', async () => {
        renderSongRunner('/songs/twinkle/play?record=1');

        await screen.findByText('Twinkle');
        expect(screen.getByTestId('permission-gate')).toHaveAttribute('data-required', 'true');
    });

    it('plays blob-backed recordings from the song detail screen', async () => {
        persistenceMocks.loadRecordings.mockResolvedValueOnce([
            {
                id: 'twinkle',
                title: 'Twinkle Recording',
                duration: 5,
                createdAt: '2026-03-09T00:00:00.000Z',
                blobKey: 'blob-1',
            },
        ]);

        renderSongDetail();

        await screen.findByText('Past Recordings');
        fireEvent.click(screen.getByRole('button', { name: '▶' }));

        await waitFor(() => {
            expect(playbackUtilsMocks.playRecordingWithSoundCheck).toHaveBeenCalledWith(
                expect.objectContaining({
                    recording: expect.objectContaining({ blobKey: 'blob-1' }),
                    controller: expect.any(Object),
                }),
            );
        });
        expect(screen.getByRole('button', { name: '⏹' })).toBeInTheDocument();
    });
});
