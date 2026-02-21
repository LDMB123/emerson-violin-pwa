import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SONG_SECTION_COMPLETED } from '../../src/utils/event-names.js';

const songLibraryMocks = vi.hoisted(() => ({
    getSongById: vi.fn(async () => ({
        id: 'twinkle',
        bpm: 80,
        sections: [
            { id: 'section-a', label: 'Section A', start: 0, end: 1 },
            { id: 'section-b', label: 'Section B', start: 1, end: 3 },
        ],
    })),
    getSongSections: vi.fn(async () => [
        { id: 'section-a', label: 'Section A', start: 0, end: 1 },
        { id: 'section-b', label: 'Section B', start: 1, end: 3 },
    ]),
}));

const progressionMocks = vi.hoisted(() => ({
    getSongCheckpoint: vi.fn(async () => null),
    saveSongCheckpoint: vi.fn(async () => { }),
}));

const tonePlayerMocks = vi.hoisted(() => ({
    createTonePlayer: vi.fn(() => ({
        playNote: vi.fn(async () => true),
        playSequence: vi.fn(async () => true),
        stopAll: vi.fn(),
    })),
}));

vi.mock('../../src/songs/song-library.js', () => songLibraryMocks);
vi.mock('../../src/songs/song-progression.js', () => progressionMocks);
vi.mock('../../src/audio/tone-player.js', () => tonePlayerMocks);

import { initSongPlayer } from '../../src/songs/song-player.js';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

const mountSongView = (id = 'twinkle') => {
    document.body.innerHTML = `
        <section id="view-song-${id}" class="song-view">
            <label><input type="checkbox" class="song-play-toggle" /> Play</label>
            <div class="song-controls"></div>
        </section>
    `;
    return document.getElementById(`view-song-${id}`);
};

describe('songs/song-player', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        document.body.innerHTML = '';
        songLibraryMocks.getSongById.mockClear();
        songLibraryMocks.getSongSections.mockClear();
        progressionMocks.getSongCheckpoint.mockClear();
        progressionMocks.saveSongCheckpoint.mockClear();
        globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(0), 0);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('initializes controls and dispatches section completion while playing', async () => {
        const view = mountSongView('twinkle');
        await initSongPlayer();

        const controls = view?.querySelector('[data-song-advanced-controls]');
        const playToggle = view?.querySelector('.song-play-toggle');
        expect(controls).not.toBeNull();
        expect(view?.dataset.songPlayerBound).toBe('true');
        expect(view?.dataset.songSectionId).toBe('section-a');
        expect(view?.dataset.songTempo).toBe('80');

        const emitted = [];
        document.addEventListener(SONG_SECTION_COMPLETED, (event) => emitted.push(event.detail), { once: true });

        playToggle.checked = true;
        playToggle.dispatchEvent(new Event('change', { bubbles: true }));
        await vi.advanceTimersByTimeAsync(1100);

        expect(emitted).toHaveLength(1);
        expect(emitted[0]).toMatchObject({
            songId: 'twinkle',
            sectionId: 'section-a',
            tempo: 80,
        });
    });

    it('saves checkpoint data from current session state', async () => {
        progressionMocks.getSongCheckpoint.mockResolvedValueOnce({
            sectionId: 'section-b',
            tempo: 96,
        });
        const view = mountSongView('twinkle');
        await initSongPlayer();

        const playToggle = view?.querySelector('.song-play-toggle');
        const saveButton = view?.querySelector('[data-song-save-checkpoint]');
        playToggle.checked = true;
        playToggle.dispatchEvent(new Event('change', { bubbles: true }));
        await vi.advanceTimersByTimeAsync(50);

        saveButton.click();
        await flush();

        expect(progressionMocks.saveSongCheckpoint).toHaveBeenCalledTimes(1);
        expect(progressionMocks.saveSongCheckpoint).toHaveBeenCalledWith(
            'twinkle',
            expect.objectContaining({
                sectionId: 'section-b',
                tempo: 96,
            }),
        );
    });

    it('handles resume with and without checkpoint data', async () => {
        progressionMocks.getSongCheckpoint
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ sectionId: 'section-b', tempo: 72 });
        const view = mountSongView('twinkle');
        await initSongPlayer();

        const resumeButton = view?.querySelector('[data-song-resume-checkpoint]');
        const status = view?.querySelector('[data-song-advanced-status]');
        const sectionSelect = view?.querySelector('[data-song-section]');
        const tempoScale = view?.querySelector('[data-song-tempo-scale]');

        resumeButton.click();
        await flush();
        expect(status?.textContent).toBe('No checkpoint yet.');

        resumeButton.click();
        await flush();
        expect(sectionSelect?.value).toBe('section-b');
        expect(tempoScale?.value).toBe('90');
        expect(status?.textContent).toContain('Checkpoint restored');
    });
});
