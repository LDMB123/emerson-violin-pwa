const CATALOG_PATH = '/content/songs/catalog.v2.json';

let cachedCatalog = null;
let catalogPromise = null;

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeSection = (section, index) => ({
    id: section?.id || `section-${index + 1}`,
    label: section?.label || `Section ${index + 1}`,
    start: Number.isFinite(section?.start) ? section.start : 0,
    end: Number.isFinite(section?.end) ? section.end : 0,
});

const normalizeSong = (song) => ({
    id: song?.id || '',
    title: song?.title || song?.id || 'Untitled Song',
    tier: song?.tier || 'beginner',
    bpm: Number.isFinite(song?.bpm) ? song.bpm : 80,
    time: song?.time || '4/4',
    sections: Array.isArray(song?.sections) ? song.sections.map(normalizeSection) : [],
    prerequisites: Array.isArray(song?.prerequisites) ? song.prerequisites.filter(Boolean) : [],
});

const normalizeCatalog = (raw) => {
    const songs = Array.isArray(raw?.songs) ? raw.songs.map(normalizeSong).filter((song) => song.id) : [];
    const byId = Object.fromEntries(songs.map((song) => [song.id, song]));

    return {
        id: raw?.id || 'songs-catalog-v2',
        version: Number.isFinite(raw?.version) ? raw.version : 2,
        songs,
        byId,
        tiers: raw?.tiers || {
            beginner: songs.filter((song) => song.tier === 'beginner').length,
            intermediate: songs.filter((song) => song.tier === 'intermediate').length,
            challenge: songs.filter((song) => song.tier === 'challenge').length,
        },
    };
};

const fallbackCatalogFromDom = () => {
    if (typeof document === 'undefined') {
        return normalizeCatalog({ songs: [] });
    }

    const songs = Array.from(document.querySelectorAll('.song-card[data-song]')).map((card) => ({
        id: card.dataset.song,
        title: card.querySelector('.song-title')?.textContent?.trim() || card.dataset.song,
        tier: card.dataset.level === 'challenge'
            ? 'challenge'
            : card.dataset.level === 'practice'
                ? 'intermediate'
                : 'beginner',
        bpm: 80,
        time: '4/4',
        sections: [
            { id: 'section-a', label: 'A', start: 0, end: 8 },
            { id: 'section-b', label: 'B', start: 8, end: 16 },
        ],
        prerequisites: card.dataset.level === 'challenge' ? ['u-int-04'] : [],
    }));

    return normalizeCatalog({ songs });
};

const fetchCatalog = async () => {
    if (typeof fetch !== 'function') {
        return fallbackCatalogFromDom();
    }

    const response = await fetch(CATALOG_PATH, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Song catalog fetch failed: ${response.status}`);
    }

    const raw = await response.json();
    return normalizeCatalog(raw);
};

const loadCatalog = async () => {
    try {
        return await fetchCatalog();
    } catch {
        return fallbackCatalogFromDom();
    }
};

export const getSongCatalog = async ({ forceRefresh = false } = {}) => {
    if (!forceRefresh && cachedCatalog) {
        return clone(cachedCatalog);
    }

    if (!catalogPromise || forceRefresh) {
        catalogPromise = loadCatalog().then((catalog) => {
            cachedCatalog = catalog;
            return cachedCatalog;
        }).finally(() => {
            catalogPromise = null;
        });
    }

    const catalog = await catalogPromise;
    return clone(catalog);
};

export const getSongById = async (songId) => {
    if (!songId) return null;
    const catalog = await getSongCatalog();
    return catalog.byId?.[songId] || null;
};

export const getSongSections = async (songId) => {
    const song = await getSongById(songId);
    return song?.sections || [];
};
