import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';
import { getSongById } from '../../songs/song-library.js';
import { loadRecordings } from '../../persistence/loaders.js';
import { useProgressSummary } from '../../hooks/useProgressSummary.js';
import { Button } from '../../components/primitives/Button.jsx';
import { useTapTempo } from '../../hooks/useTapTempo.js';
import { getPublicAssetPath } from '../../utils/public-asset-path.js';

const ART_MAP = {
    'open_strings': '🎻',
    'twinkle': '⭐',
    'mary': '🐑',
    'lightly_row': '🚣',
    'go_tell_aunt_rhody': '🎀',
    'string_waltz': '💃',
    'bridge_bells': '🔔',
    'panda_parade': '🐼',
    'stepwise_song': '🪜',
    'echo_strings': '🔊',
    'gentle_bow': '🌿',
    'a_string_march': '🥁',
    'ode_to_joy': '🎉',
    'minuet_1': '🎼',
    'gavotte': '🎻',
    'allegretto_lane': '🏃',
    'string_crossing_etude': '🌉',
    'rhythm_bridge': '🌁',
    'lyric_bowing': '🎶',
    'syncopation_study': '🎵',
    'scale_rondo': '🎹',
    'duet_line': '👯',
    'clarity_etude': '✨',
    'balanced_bows': '⚖️',
    'perpetual_motion': '⚡',
    'spiccato_run': '🏹',
    'double_stop_sprint': '🎯',
    'flying_shift': '🦅',
    'festival_reel': '🎪',
    'virtuoso_loop': '🔥'
};

const TIER_STARS_MAP = {
    'gold': 5,
    'silver': 4,
    'bronze': 3,
    'foundation': 1
};

const SKILLS_MAP = {
    'easy': ['🎯Pitch', '🥁Rhythm'],
    'practice': ['🎯Pitch', '🥁Rhythm', '🎻Bowing'],
    'challenge': ['🎯Pitch', '🥁Rhythm', '📖Reading']
};

export function SongDetailView() {
    const { songId } = useParams();
    const [song, setSong] = useState(null);
    const [recordings, setRecordings] = useState([]);
    const [playingRec, setPlayingRec] = useState(null);
    const audioRef = useRef(new Audio());
    const { summary } = useProgressSummary();
    const { bpmOverride, handleTap: tapTempo, reset: resetTap } = useTapTempo({ onBpm: () => { } });

    useEffect(() => {
        let mounted = true;

        async function load() {
            const data = await getSongById(songId);
            const allRecordings = await loadRecordings();

            if (mounted) {
                setSong(data);
                if (allRecordings) {
                    setRecordings(allRecordings.filter(rec => rec.id === songId));
                }
            }
        }

        load();

        return () => { mounted = false; };
    }, [songId]);

    if (!song) {
        return (
            <section className="view is-active" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <Typography variant="h2">Loading...</Typography>
            </section>
        );
    }

    const songSummary = summary?.songScores?.[songId] || {};
    const stars = songSummary?.bestStars || 0;

    let masteryTier = 'foundation';
    if (stars >= 5) masteryTier = 'gold';
    else if (stars >= 4) masteryTier = 'silver';
    else if (stars >= 2) masteryTier = 'bronze';

    // Skills to display based on the song tier/difficulty
    const skills = SKILLS_MAP[song.tier] || ['🎯Pitch'];

    const formatDuration = (sec) => {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <section className="view song-view is-active" id={`view-song-${songId}`} aria-label="Song Details" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <div className="view-header" style={{ padding: 'var(--space-4)' }}>
                <Link to="/songs" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="24" height="24">
                        <path d="M15 18l-6-6 6-6" />
                    </svg> Back
                </Link>
                <Typography variant="h2" style={{ textTransform: 'capitalize' }}>
                    {song.title || songId.replace(/-/g, ' ')}
                </Typography>
            </div>

            <div style={{ padding: '0 var(--space-4) var(--space-4)', flex: 1 }}>

                {/* Sheet Music Stub */}
                <div className="glass" style={{
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-4)',
                    fontSize: '3rem',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>♩ ♩ ♩ ♩</span>
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        bottom: 0,
                        width: 0,
                        height: 0,
                        borderLeft: '10px solid transparent',
                        borderRight: '10px solid transparent',
                        borderBottom: '10px solid var(--color-primary)'
                    }} />
                </div>

                {/* Metadata Strip */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--space-4)',
                    padding: 'var(--space-2) 0',
                    borderBottom: '2px solid rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.4rem', color: 'var(--color-warning)' }}>
                            {'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}
                        </span>
                        <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                            {masteryTier} Mastery
                        </span>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            type="button"
                            onClick={tapTempo}
                            style={{
                                background: bpmOverride ? 'var(--color-primary)' : 'var(--color-surface)',
                                color: bpmOverride ? 'white' : 'var(--color-text)',
                                border: 'none', borderRadius: '16px', padding: '4px 12px',
                                cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            ♩ = {bpmOverride || song.bpm} BPM {bpmOverride ? '(tap)' : ''}
                        </button>
                        {bpmOverride && (
                            <button type="button" onClick={resetTap} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>✕</button>
                        )}
                        &middot; {song.tier.charAt(0).toUpperCase() + song.tier.slice(1)}
                    </div>
                </div>

                {/* Panda Tip */}
                {(() => {
                    const DEFAULT_TIPS = [
                        "Try playing the first four notes slowly. Listen for a ring!",
                        "Focus on keeping your bow straight and relaxed.",
                        "Count the beats out loud before you start playing.",
                        "Listen for the open string notes — they should ring clearly."
                    ];
                    const tips = song.practiceTips?.length ? song.practiceTips : DEFAULT_TIPS;
                    const tip = tips[Math.floor(Date.now() / 60000) % tips.length];
                    return (
                        <div className="glass" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <picture>
                                <source srcSet={getPublicAssetPath('./assets/illustrations/mascot-happy.webp')} type="image/webp" />
                                <img src={getPublicAssetPath('./assets/illustrations/mascot-happy.webp')} alt="Panda Tip" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                            </picture>
                            <Typography variant="body" style={{ fontStyle: 'italic', margin: 0 }}>
                                "{tip}"
                            </Typography>
                        </div>
                    );
                })()}

                {/* Skills & Sections */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <strong>Skills:</strong>
                        {skills.map(s => <span key={s} className="filter-chip" style={{ padding: '4px 12px', fontSize: '0.85rem' }}>{s}</span>)}
                    </div>
                    {song.sections?.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong>Sections:</strong>
                            {song.sections.map(s => (
                                <button key={s.id} className="btn" style={{ padding: '6px 12px', fontSize: '1rem', border: '2px solid rgba(0,0,0,0.1)', background: 'transparent' }}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Primary Actions */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: 'var(--space-6)' }}>
                    <Link to={`/songs/${songId}/play`} className="btn btn-primary" style={{ flex: 1, padding: '16px', fontSize: '1.4rem' }}>
                        ▶ Play
                    </Link>
                    <Link to={`/songs/${songId}/play?record=1`} className="btn btn-secondary" style={{ flex: 1, padding: '16px', fontSize: '1.4rem', border: '2px solid var(--color-warning)', color: 'var(--color-warning)' }}>
                        🔴 Record
                    </Link>
                </div>

                {/* Past Recordings */}
                <div>
                    <Typography variant="h3" style={{ marginBottom: '16px' }}>Past Recordings</Typography>
                    {recordings.length === 0 ? (
                        <div className="glass" style={{ textAlign: 'center', padding: 'var(--space-4)', opacity: 0.8 }}>
                            <span style={{ fontSize: '2rem' }}>🎙️</span>
                            <p style={{ marginTop: '8px' }}>No recordings yet! Try recording your next practice.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recordings.map((rec) => (
                                <div key={rec.id + rec.createdAt} className="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>
                                            {new Date(rec.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} &middot; {formatDuration(rec.duration || 0)}
                                        </div>
                                    </div>
                                    <button
                                        className="btn"
                                        onClick={() => {
                                            if (playingRec === rec.createdAt) {
                                                audioRef.current.pause();
                                                setPlayingRec(null);
                                            } else {
                                                audioRef.current.src = rec.dataUrl;
                                                audioRef.current.play().catch(e => console.error(e));
                                                setPlayingRec(rec.createdAt);
                                                audioRef.current.onended = () => setPlayingRec(null);
                                            }
                                        }}
                                        style={{ background: playingRec === rec.createdAt ? 'var(--color-warning)' : 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {playingRec === rec.createdAt ? '⏹' : '▶'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </section>
    );
}
