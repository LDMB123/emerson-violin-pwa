export const forEachUnboundSongView = (boundKey, onView) => {
    if (!boundKey || typeof onView !== 'function') return;
    const views = document.querySelectorAll('.song-view');
    views.forEach((view) => {
        if (view.dataset[boundKey] === 'true') return;
        view.dataset[boundKey] = 'true';
        onView(view);
    });
};

export const getSongViewPlaybackElements = (view, resolveSongId) => {
    if (!view) return null;
    const toggle = view.querySelector('.song-play-toggle');
    const sheet = view.querySelector('.song-sheet');
    const playhead = view.querySelector('.song-playhead');
    const songId = typeof resolveSongId === 'function' ? resolveSongId(view) : null;
    return {
        toggle,
        sheet,
        playhead,
        songId,
    };
};
