import { getSongById, getSongSections } from './song-library.js';
import { getSongCheckpoint } from './song-progression.js';
import { applyControlsToView } from './song-player-controls.js';
import { createControls, parseViewSongId } from './song-player-view.js';

/** Binds advanced playback controls into each uninitialized song view. */
export const initSongPlayer = async () => {
    const views = Array.from(document.querySelectorAll('.song-view'));
    for (const view of views) {
        if (view.dataset.songPlayerBound === 'true') continue;
        view.dataset.songPlayerBound = 'true';

        const songId = parseViewSongId(view.id);
        if (!songId) continue;

        // Signal early (before async DB reads) so the legacy play-along in
        // song-progress.js won't fire if the user taps play during init.
        view.dataset.songAdvancedAudio = 'true';

        const [song, sections, checkpoint] = await Promise.all([
            getSongById(songId),
            getSongSections(songId),
            getSongCheckpoint(songId),
        ]);

        const controls = createControls({ song, checkpoint });
        const anchor = view.querySelector('.song-controls');
        if (anchor?.parentElement) {
            anchor.parentElement.insertBefore(controls, anchor.nextSibling);
        }

        applyControlsToView({
            view,
            controls,
            song,
            sections,
        });
    }
};

/** Starts best-effort initialization for advanced song-player controls. */
export const init = () => {
    initSongPlayer().catch(() => {
        // Song player controls are best effort.
    });
};
