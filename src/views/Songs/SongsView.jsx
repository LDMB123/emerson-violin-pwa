import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';
import { useSongCatalog } from '../../hooks/useSongCatalog.js';
import { useProgressSummary } from '../../hooks/useProgressSummary.js';
import { FilterChips } from '../../components/primitives/FilterChips.jsx';
import { Skeleton } from '../../components/primitives/Skeleton.jsx';
import { useLongPress } from '../../hooks/useLongPress.js';
import { SharedViewHeader } from '../../components/shared/SharedViewHeader.jsx';
import styles from './SongsView.module.css';

const ART_MAP = {
    // ... existing ART_MAP ...
};

export function SongsView() {
    const {
        filteredSongs,
        isLoading,
        searchQuery,
        setSearchQuery,
        tierFilter,
        setTierFilter,
        lastSongId
    } = useSongCatalog();
    const { summary } = useProgressSummary();

    const TIER_STARS = { beginner: 2, intermediate: 3, challenge: 5 };

    const filterOptions = [
        { id: 'all', label: 'All' },
        { id: 'easy', label: 'Easy' },
        { id: 'practice', label: 'Practice' },
        { id: 'challenge', label: 'Challenge' }
    ];

    const longPressProps = useLongPress(() => {
        // Spec 29: useLongPress provides haptic feedback for custom actions.
        if (window.navigator?.vibrate) {
            window.navigator.vibrate(50);
        }
    });

    return (
        <section className={`view is-active ${styles.songsView}`} id="view-songs" aria-label="Song Library" style={{ display: 'block' }} data-count={filteredSongs.length}>
            <SharedViewHeader
                title="Songs"
                backTo="/home"
                heroSrc="/assets/illustrations/mascot-reading.png"
                heroAlt="Panda reading violin sheet music"
            />

            <Typography className="view-lead">Resume your last song or browse pieces that match today's level.</Typography>

            {lastSongId && !searchQuery && (
                <Link className="songs-continue-card glass btn btn-primary btn-giant" viewTransition to={`/songs/${lastSongId}/play`} data-continue-last-song>
                    <span className="btn-giant-icon">▶️</span>
                    <span className="btn-giant-text" data-continue-last-song-title>PLAY LAST SONG</span>
                </Link>
            )}

            <input
                type="search"
                className="songs-search glass"
                placeholder="Search songs…"
                aria-label="Search songs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />

            {!searchQuery && (
                <div className={styles.filtersWrap}>
                    <FilterChips
                        options={filterOptions}
                        value={tierFilter}
                        onChange={setTierFilter}
                        color="var(--color-primary)"
                    />
                </div>
            )}

            <div className={`songs-grid ${styles.songsGrid}`} id="songs-grid">
                {isLoading ? (
                    <>
                        <Skeleton height="100px" borderRadius="24px" />
                        <Skeleton height="100px" borderRadius="24px" />
                        <Skeleton height="100px" borderRadius="24px" />
                        <Skeleton height="100px" borderRadius="24px" />
                    </>
                ) : (
                    filteredSongs.map(song => (
                        <Link
                            key={song.id}
                            className={`song-card glass ${styles.songCard} ${song.tier === 'challenge' ? `${styles.isLocked} song-soft-lock` : ''} ${song.tier === 'advanced' ? styles.isMastered : ''} ${song.isRecommended ? styles.isRecommended : ''}`}
                            to={`/songs/${song.id}`}
                            viewTransition
                            onClick={(e) => { if (song.tier === 'challenge') e.preventDefault(); }}
                            {...longPressProps}
                            data-song={song.id}
                            data-tier={song.tier}
                            aria-describedby={song.tier === 'challenge' ? `song-lock-${song.id}` : undefined}
                        >
                            <div className="song-art">{ART_MAP[song.id] || '🎵'}</div>
                            <div className={`song-title ${styles.songTitle}`}>{song.title}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--color-warning)' }}>{'⭐'.repeat(TIER_STARS[song.tier] || 2)}</span>
                                <span className="song-tier-badge" style={{ color: 'var(--color-text-muted)', fontWeight: 'bold', textTransform: 'capitalize' }}>
                                    {song.tier === 'beginner' ? '🟢 Easy' : song.tier === 'intermediate' ? '🟡 Practice' : song.tier === 'challenge' ? '🔴 Challenge' : song.tier}
                                </span>
                                {(() => {
                                    const earned = summary?.songScores?.[song.id]?.bestStars || 0;
                                    if (!earned) return null;
                                    let tier = 'bronze';
                                    if (earned >= 5) tier = 'gold';
                                    else if (earned >= 4) tier = 'silver';
                                    return (
                                        <span style={{ fontWeight: 700, textTransform: 'capitalize', color: tier === 'gold' ? '#D4A017' : tier === 'silver' ? '#8A8A8A' : '#CD7F32' }}>
                                            {tier}
                                        </span>
                                    );
                                })()}
                            </div>
                            {song.tier === 'challenge' && (
                                <div className="song-lock-hint" id={`song-lock-${song.id}`}>Goal: 3 clean songs.</div>
                            )}
                            <div className={`song-play ${styles.songPlay}`} aria-hidden="true">▶</div>
                        </Link>
                    ))
                )}
            </div>

            {(!isLoading && filteredSongs.length === 0) && (
                <div className="songs-empty glass" role="status" aria-live="polite">
                    <picture>
                        <source srcSet="/assets/illustrations/mascot-encourage.webp" type="image/webp" />
                        <img src="/assets/illustrations/mascot-encourage.webp" alt="Encouraging panda coach" className="empty-state-mascot" loading="lazy" decoding="async" />
                    </picture>
                    <div className="empty-state-content">
                        <h3>I can't find that song!</h3>
                        <p>Try searching for a different word.</p>
                    </div>
                </div>
            )}

            <picture>
                <source srcSet="/assets/illustrations/mascot-happy.webp" type="image/webp" />
                <img src="/assets/illustrations/mascot-happy.webp" alt="" className="corner-mascot" loading="lazy" decoding="async" width="1024" height="1024" />
            </picture>
        </section>
    );
}
