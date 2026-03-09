const tierFromLabel = (label = '') => {
    const normalized = String(label).toLowerCase();
    if (normalized.includes('challenge')) return 'challenge';
    if (normalized.includes('intermediate')) return 'intermediate';
    return 'beginner';
};

const latestProgressSongId = (progressState, catalogSongIds) => {
    const songs = progressState?.songs;
    if (!songs || typeof songs !== 'object') return null;

    return Object.entries(songs)
        .filter(([songId]) => catalogSongIds.has(songId))
        .sort(([, left], [, right]) => (right?.updatedAt || 0) - (left?.updatedAt || 0))[0]?.[0] || null;
};

export const pickCoachSongId = ({ catalog, progressState = null, preferredLabel = '' } = {}) => {
    const songs = Array.isArray(catalog?.songs) ? catalog.songs : [];
    if (!songs.length) return null;

    const catalogSongIds = new Set(songs.map((song) => song.id));
    const recentSongId = latestProgressSongId(progressState, catalogSongIds);
    if (recentSongId) return recentSongId;

    const preferredTier = tierFromLabel(preferredLabel);
    const tierMatch = songs.find((song) => song.tier === preferredTier);
    return tierMatch?.id || songs[0]?.id || null;
};
