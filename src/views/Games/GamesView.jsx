import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';
import { useGameSort } from '../../hooks/useGameSort.js';
import { FilterChips } from '../../components/primitives/FilterChips.jsx';
import { SharedViewHeader } from '../../components/shared/SharedViewHeader.jsx';
import styles from './GamesView.module.css';
import { getPublicAssetPath } from '../../utils/public-asset-path.js';

export function GamesView() {
    const { selectedSort, setSelectedSort, filteredGames, favoriteIds, toggleFavorite, gameMastery, SKILL_FILTERS } = useGameSort();

    const SKILL_COLORS = {
        Pitch: 'var(--color-skill-pitch)',
        Rhythm: 'var(--color-skill-rhythm)',
        Bowing: 'var(--color-skill-bowing)',
        Reading: 'var(--color-skill-reading)',
    };

    const sortOptions = [
        { id: 'all', label: 'All' },
        { id: 'favorites', label: 'Favorites' },
        { id: 'quick', label: 'Quick' },
        ...SKILL_FILTERS.map(skill => ({ id: skill, label: skill }))
    ];

    const currentSkillColor = SKILL_COLORS[selectedSort] || 'var(--color-primary)';

    return (
        <section id="view-games" className={`view is-active ${styles.gamesView}`} aria-label="Games" style={{ display: 'block' }}>
            <SharedViewHeader
                title="Games"
                backTo="/home"
                heroSrc="./assets/illustrations/mascot-celebrate.webp"
                heroAlt="Panda celebrating your progress"
            />

            <Typography className="view-lead">Pick a quick win, tune the difficulty, or favorite a game to come back later.</Typography>

            <div className={styles.filtersWrap}>
                <FilterChips
                    options={sortOptions}
                    value={selectedSort}
                    onChange={setSelectedSort}
                    color={currentSkillColor}
                />
            </div>

            <div className={`games-grid ${styles.gamesGrid}`}>
                {filteredGames.map((game) => (
                    <Link
                        key={game.id}
                        to={`/games/${game.id}`}
                        viewTransition
                        className={`game-card glass ${styles.gameCard} ${game.curated ? 'game-card-curated' : ''}`}
                        data-game-id={game.id}
                        data-sort-tags={game.tags.join(',')}
                        style={{ borderLeft: `4px solid ${SKILL_COLORS[game.skill] || 'var(--color-primary)'}` }}
                    >
                        {game.badge && <span className="game-badge">{game.badge}</span>}
                        {!gameMastery[game.id] && <span className="game-badge" style={{ background: 'var(--color-success)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', position: 'absolute', top: '8px', right: '8px' }}>New!</span>}
                        <div className={`game-title ${styles.gameTitle}`}>{game.title}</div>
                        {game.skill && (
                            <span style={{ fontSize: '0.75rem', color: SKILL_COLORS[game.skill] || 'var(--color-text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                {game.skill}
                            </span>
                        )}
                        {gameMastery[game.id] && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {gameMastery[game.id].tier && (
                                    <span style={{ textTransform: 'capitalize', fontWeight: 'bold', color: gameMastery[game.id].tier === 'gold' ? '#D4A017' : gameMastery[game.id].tier === 'silver' ? '#8A8A8A' : gameMastery[game.id].tier === 'bronze' ? '#CD7F32' : undefined }}>
                                        {gameMastery[game.id].tier}
                                    </span>
                                )}
                                {gameMastery[game.id].bestScore != null && (
                                    <span>Best: {Math.round(gameMastery[game.id].bestScore)}%</span>
                                )}
                            </div>
                        )}
                        <span className={`game-play-cta ${styles.gamePlayCta}`}>▶</span>
                        <button
                            className="game-favorite-btn"
                            aria-pressed={favoriteIds.has(game.id)}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(game.id); }}
                            data-game-favorite-bound="true"
                            aria-label="Toggle Favorite"
                        >
                            {favoriteIds.has(game.id) ? '⭐' : '☆'}
                        </button>
                    </Link>
                ))}
            </div>

            {filteredGames.length === 0 && (
                <div className="games-empty glass" role="status" aria-live="polite">
                    <picture>
                        <source srcSet={getPublicAssetPath('./assets/illustrations/mascot-encourage.webp')} type="image/webp" />
                        <img src={getPublicAssetPath('./assets/illustrations/mascot-encourage.webp')} alt="Encouraging panda coach" className="empty-state-mascot" loading="lazy" decoding="async" />
                    </picture>
                    <div className="empty-state-content">
                        <h3>Oh no, no games found!</h3>
                        <p>Try picking a different category above.</p>
                    </div>
                </div>
            )}

            <picture>
                <source srcSet={getPublicAssetPath('./assets/illustrations/mascot-celebrate.webp')} type="image/webp" />
                <img src={getPublicAssetPath('./assets/illustrations/mascot-celebrate.webp')} alt="" className="corner-mascot" loading="lazy" decoding="async" />
            </picture>
        </section>
    );
}
