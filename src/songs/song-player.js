import { getSongById, getSongSections } from './song-library.js';
import { getSongCheckpoint } from './song-progression.js';
import { applyControlsToView } from './song-player-controls.js';
import { createControls, parseViewSongId } from './song-player-view.js';

export const initSongPlayer = async () => {
    const views = Array.from(document.querySelectorAll('.song-view'));
    for (const view of views) {
        if (view.dataset.songPlayerBound === 'true') continue;
        view.dataset.songPlayerBound = 'true';

        const songId = parseViewSongId(view.id);
        if (!songId) continue;

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

export const init = () => {
    initSongPlayer().catch(() => {
        // Song player controls are best effort.
    });
};
