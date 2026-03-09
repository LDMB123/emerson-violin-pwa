import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';
import { useProgressSummary } from '../../hooks/useProgressSummary.js';
import { SharedViewHeader } from '../../components/shared/SharedViewHeader.jsx';
import styles from './WinsView.module.css';

const BADGE_META = [
    { id: 'first_note', name: 'First Note', icon: 'first_note.png', pandaSpeech: 'You played your very first note! Every musician starts here.' },
    { id: 'streak_7', name: 'Week Warrior', icon: 'badge_practice_streak_1769390952199.webp', pandaSpeech: 'A whole week of practice! You\'re building a great habit!' },
    { id: 'level_5', name: 'Rising Star', icon: 'rising_star.png', pandaSpeech: 'You reached level 5! Your skills are really growing!' },
    { id: 'practice_100', name: 'Dedicated', icon: 'dedicated.png', pandaSpeech: '100 practice sessions! That\'s real dedication!' },
    { id: 'pitch_perfect', name: 'Pitch Perfect', icon: 'badge_pitch_master_1769390924763.webp', pandaSpeech: 'Your pitch accuracy is amazing! What a great ear!' },
    { id: 'rhythm_master', name: 'Rhythm Master', icon: 'badge_rhythm_star_1769390938421.webp', pandaSpeech: 'You\'ve mastered rhythm! Keep that beat going!' },
    { id: 'bow_hero', name: 'Bow Hero', icon: 'badge_bow_hero_1769390964607.webp', pandaSpeech: 'Your bow control is fantastic! Beautiful technique!' },
    { id: 'ear_training', name: 'Golden Ear', icon: 'golden_ear.png', pandaSpeech: 'You can hear the difference! What golden ears you have!' },
    { id: 'all_games', name: 'Game Master', icon: 'game_master.png', pandaSpeech: 'You\'ve played every single game! What an explorer!' },
];

function SkillMeter({ label, value, colorVar, icon }) {
    const [revealed, setRevealed] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setRevealed(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const fillPct = Math.max(0, Math.min(100, value)) / 100;
    return (
        <div className="skill-meter">
            <span className="skill-name" style={{ width: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {icon && <img src={`/assets/icons/${icon}`} alt="" width="24" height="24" loading="lazy" decoding="async" />}
                {label}
            </span>
            <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="skill-meter-svg" style={{ flex: 1, height: '16px', marginLeft: '12px' }}>
                <rect width="100" height="10" fill="var(--color-text-muted)" opacity="0.2" rx="5" />
                <rect width="100" height="10" fill={`var(${colorVar})`} rx="5"
                    className={`skill-bar-fill ${revealed ? 'revealed' : ''}`}
                    style={{
                        transformOrigin: 'left center',
                        transform: revealed ? `scaleX(${fillPct})` : 'scaleX(0)',
                        transition: 'transform var(--duration-slow) var(--ease-bounce)'
                    }} />
            </svg>
        </div>
    );
}

export function WinsView() {
    const { summary, isLoading } = useProgressSummary();
    const [starsRevealed, setStarsRevealed] = useState(0);
    const [selectedBadge, setSelectedBadge] = useState(null);

    const dailyStars = summary?.dailyStars || 0;

    // Animate stars in sequence
    useEffect(() => {
        if (dailyStars > 0) {
            const timer = setInterval(() => {
                setStarsRevealed(prev => {
                    if (prev < dailyStars) return prev + 1;
                    clearInterval(timer);
                    return prev;
                });
            }, 200);
            return () => clearInterval(timer);
        }
    }, [dailyStars]);

    if (isLoading || !summary) return null; // Hydrating

    const unlockedIds = new Set(
        BADGE_META
            .filter(m => {
                const t = summary.tracker;
                if (!t) return false;
                // Support both a WASM tracker with is_unlocked() and a plain Set/object
                if (typeof t.is_unlocked === 'function') return t.is_unlocked(m.id);
                if (t instanceof Set) return t.has(m.id);
                return !!t[m.id];
            })
            .map(m => m.id)
    );
    const skills = summary.skills || {};

    return (
        <section className={`view is-active ${styles.winsView}`} id="view-progress" aria-label="Progress" style={{ display: 'block' }}>
            <SharedViewHeader title="Wins" backTo="/home" />

            <Typography className="view-lead">Check today's streak, see what's next, and hand off the review to a grown-up when you're done.</Typography>

            <div className="progress-layout">
                {/* Hero Streak Card */}
                <div className="progress-hero glass">
                    <picture>
                        <source srcSet="/assets/illustrations/mascot-celebrate.webp" type="image/webp" />
                        <img src="/assets/illustrations/mascot-celebrate.webp" alt="Great job!" className="progress-mascot" loading="lazy" decoding="async" />
                    </picture>
                    <div className="streak-display">
                        <svg viewBox="0 0 40 40" className="flame-icon" aria-hidden="true">
                            <path className="flame-body" d="M20 5 C15 15, 8 20, 10 30 C12 35, 28 35, 30 30 C32 20, 25 15, 20 5Z" fill="var(--color-secondary)">
                                <animateTransform attributeName="transform" type="scale" values="1,1; 1.05,1.08; 1,1" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
                            </path>
                            <path className="flame-inner" d="M20 15 C18 20, 14 22, 16 28 C17 30, 23 30, 24 28 C26 22, 22 20, 20 15Z" fill="var(--color-warning)" opacity="0.8">
                                <animateTransform attributeName="transform" type="scale" values="1,1; 0.95,1.1; 1,1" dur="1.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
                            </path>
                        </svg>
                        <span className="streak-number">{summary.streak || 0}</span>
                        <span className="streak-label">day streak</span>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {[7, 14, 30, 60, 100].map(m => (
                                <span key={m} style={{
                                    padding: '3px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    background: (summary.streak || 0) >= m ? 'var(--color-primary)' : 'rgba(0,0,0,0.08)',
                                    color: (summary.streak || 0) >= m ? '#fff' : 'var(--color-text-muted)',
                                    transition: 'all 0.3s'
                                }}>
                                    {m}d {(summary.streak || 0) >= m ? '✓' : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                    <p className="progress-hero-note">Great session! Celebrate first, then hand off to a grown-up.</p>
                    <Link className="btn btn-primary" to="/parent/review">For Grown-Ups Review</Link>
                </div>

                {/* Today's Stars panel */}
                <div className="stars-panel glass">
                    <h3>Today's Stars</h3>
                    <div className="stars-display" style={{ display: 'flex', gap: '8px', fontSize: '2rem', height: '40px' }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <span key={i} className={`star-icon ${i <= starsRevealed ? 'star-earned' : 'star-empty'}`}
                                style={{
                                    color: i <= starsRevealed ? 'var(--color-secondary)' : 'var(--color-text-muted)',
                                    opacity: i <= starsRevealed ? 1 : 0.3,
                                    transition: 'opacity var(--duration-normal)',
                                    animation: i <= starsRevealed ? `star-pop var(--duration-celebration) var(--ease-spring) forwards` : 'none'
                                }}>
                                ★
                            </span>
                        ))}
                    </div>
                </div>

                {/* Skills Panel */}
                <div className="skills-panel glass">
                    <h3>Skills</h3>
                    <div className="skills-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <SkillMeter label="Pitch" value={skills.pitch || 0} colorVar="--color-skill-pitch" icon="pitch.png" />
                        <SkillMeter label="Rhythm" value={skills.rhythm || 0} colorVar="--color-skill-rhythm" icon="rhythm.png" />
                        <SkillMeter label="Reading" value={skills.reading || 0} colorVar="--color-skill-reading" icon="reading.png" />
                        <SkillMeter label="Bowing" value={skills.bowing || skills.bow_control || 0} colorVar="--color-skill-bowing" icon="bowing.png" />
                        <SkillMeter label="Posture" value={skills.posture || 0} colorVar="--color-skill-posture" icon="posture.png" />
                    </div>
                </div>

                {/* Child-Friendly Badges Grid */}
                <div className="achievements-panel glass">
                    <h3>Badges</h3>
                    <div className="badges-grid">
                        {BADGE_META.map(meta => {
                            const isUnlocked = unlockedIds.has(meta.id);
                            return (
                                <button key={meta.id} className={`badge-item ${isUnlocked ? 'unlocked' : 'locked'}`} data-achievement={meta.id}
                                    onClick={() => isUnlocked && setSelectedBadge(meta)}
                                    style={{ background: 'none', border: 'none', padding: 0, cursor: isUnlocked ? 'pointer' : 'default' }}
                                    aria-label={isUnlocked ? `View ${meta.name} badge details` : `${meta.name} - locked`}
                                >
                                    <div className="badge-art">
                                        {meta.icon ? (
                                            <picture>
                                                {meta.icon.endsWith('.webp') && <source srcSet={`/assets/badges/${meta.icon}`} type="image/webp" />}
                                                <img src={`/assets/badges/${meta.icon}`} alt="" width="200" height="200" loading="lazy" decoding="async" />
                                            </picture>
                                        ) : (
                                            <span className="badge-fallback">{meta.name}</span>
                                        )}
                                        {!isUnlocked && <span className="badge-lock">🔒</span>}
                                    </div>
                                    <span className="badge-name">{meta.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Badge detail modal (spec line 1997) */}
            {selectedBadge && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal, 400)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(53, 32, 25, 0.5)' }}
                    onClick={() => setSelectedBadge(null)}>
                    <div style={{ background: 'var(--color-surface, #fff)', borderRadius: '22px', padding: '32px 24px', maxWidth: '380px', width: '90%', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ marginBottom: '16px' }}>
                            <img src={`/assets/badges/${selectedBadge.icon}`} alt={selectedBadge.name} width="120" height="120" style={{ borderRadius: '50%' }} />
                        </div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: '8px' }}>{selectedBadge.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--color-bg-alt, #FFEFE2)', borderRadius: '16px', padding: '12px', marginBottom: '16px', textAlign: 'left' }}>
                            <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🐼</span>
                            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', margin: 0, lineHeight: 1.4 }}>"{selectedBadge.pandaSpeech}"</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => setSelectedBadge(null)} style={{ width: '100%' }}>Awesome!</button>
                    </div>
                </div>
            )}
        </section>
    );
}
