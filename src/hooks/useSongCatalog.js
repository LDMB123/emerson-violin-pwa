import { useState, useEffect, useMemo } from 'react';
import { getSongCatalog } from '../songs/song-library.js';
import { readJsonAsync } from '../utils/storage-utils.js';
import { buildSongUnlockMap } from '../songs/song-progression.js';

export function useSongCatalog() {
    const [catalog, setCatalog] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState('all');
    const [lastSongId, setLastSongId] = useState(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const [catalogData, progressData] = await Promise.all([
                    getSongCatalog(),
                    readJsonAsync('panda-violin:song-progress-v2'),
                ]);

                if (!mounted) return;

                if (catalogData) {
                    const unlock = await buildSongUnlockMap(catalogData).catch(() => ({ unlockMap: {} }));
                    const songs = catalogData.songs.map((song) => ({
                        ...song,
                        hasCheckpoint: Boolean(progressData?.songs?.[song.id]?.checkpoint),
                        isUnlocked: unlock.unlockMap?.[song.id] !== false,
                    }));
                    setCatalog({
                        ...catalogData,
                        songs,
                    });
                }

                if (progressData?.songs) {
                    const sorted = Object.entries(progressData.songs).sort((a, b) => b[1].updatedAt - a[1].updatedAt);
                    if (sorted.length > 0) setLastSongId(sorted[0][0]);
                }
            } catch (err) {
                console.error('Failed to load song catalog', err);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, []);

    const filteredSongs = useMemo(() => {
        if (!catalog) return [];

        let result = catalog.songs;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(song => song.title.toLowerCase().includes(query));
        } else if (tierFilter !== 'all') {
            const TIER_MAP = { easy: 'beginner', practice: 'intermediate', challenge: 'challenge' };
            result = result.filter(song => song.tier === TIER_MAP[tierFilter]);
        }

        return result.map((song) => ({
            ...song,
            hasCheckpoint: Boolean(song.hasCheckpoint),
            isUnlocked: song.isUnlocked !== false,
        }));
    }, [catalog, searchQuery, tierFilter]);

    return {
        catalog,
        filteredSongs,
        isLoading,
        searchQuery,
        setSearchQuery,
        tierFilter,
        setTierFilter,
        lastSongId
    };
}
