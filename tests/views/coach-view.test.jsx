import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const recommendationsMocks = vi.hoisted(() => ({
    getLearningRecommendations: vi.fn(() => new Promise(() => {})),
}));

const songLibraryMocks = vi.hoisted(() => ({
    getSongCatalog: vi.fn(() => new Promise(() => {})),
}));

const storageUtilsMocks = vi.hoisted(() => ({
    readJsonAsync: vi.fn(async () => null),
}));

const coachSongMocks = vi.hoisted(() => ({
    pickCoachSongId: vi.fn(() => 'open_strings'),
}));

const wakeLockMocks = vi.hoisted(() => ({
    useWakeLock: vi.fn(),
}));

const storageHookMocks = vi.hoisted(() => ({
    useSessionStorage: vi.fn(() => [5, vi.fn()]),
}));

const childProfileMocks = vi.hoisted(() => ({
    readChildName: vi.fn(() => 'Emerson'),
}));

const practiceSessionMocks = vi.hoisted(() => ({
    markPracticeSessionComplete: vi.fn(),
}));

vi.mock('../../src/ml/recommendations.js', () => recommendationsMocks);
vi.mock('../../src/songs/song-library.js', () => songLibraryMocks);
vi.mock('../../src/utils/storage-utils.js', () => storageUtilsMocks);
vi.mock('../../src/coach/coach-song-contract.js', () => coachSongMocks);
vi.mock('../../src/hooks/useWakeLock.js', () => wakeLockMocks);
vi.mock('../../src/hooks/useStorage.js', () => storageHookMocks);
vi.mock('../../src/utils/child-profile.js', () => childProfileMocks);
vi.mock('../../src/utils/practice-session.js', () => practiceSessionMocks);
vi.mock('../../src/views/Games/GameRunnerView.jsx', () => ({
    GameRunnerView: () => <div>Game Runner</div>,
}));
vi.mock('../../src/views/Tools/BowingView.jsx', () => ({
    BowingView: () => <div>Bowing</div>,
}));
vi.mock('../../src/views/Tools/PostureView.jsx', () => ({
    PostureView: () => <div>Posture</div>,
}));
vi.mock('../../src/views/Songs/SongRunnerView.jsx', () => ({
    SongRunnerView: () => <div>Song Runner</div>,
}));

import { CoachView } from '../../src/views/Coach/CoachView.jsx';

describe('CoachView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        storageHookMocks.useSessionStorage.mockReturnValue([5, vi.fn()]);
        recommendationsMocks.getLearningRecommendations.mockImplementation(() => new Promise(() => {}));
        songLibraryMocks.getSongCatalog.mockImplementation(() => new Promise(() => {}));
    });

    it('shows a loading state until recommendations hydrate', () => {
        render(
            <MemoryRouter>
                <CoachView />
            </MemoryRouter>,
        );

        expect(screen.getByText('Preparing your mission...')).toBeInTheDocument();
        expect(screen.queryByLabelText('Practice Complete')).not.toBeInTheDocument();
        expect(practiceSessionMocks.markPracticeSessionComplete).not.toHaveBeenCalled();
    });
});
