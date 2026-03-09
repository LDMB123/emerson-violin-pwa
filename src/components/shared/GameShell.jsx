import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../primitives/Button.jsx';
import { Typography } from '../primitives/Typography.jsx';
import { StarRating } from '../primitives/StarRating.jsx';
import { GAME_RECORDED } from '../../utils/event-names.js';
import { getGameTuning, updateGameResult } from '../../ml/adaptive-engine.js';
import { GAME_META } from '../../games/game-config.js';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { PermissionGate } from './PermissionGate.jsx';

export function GameShell({ gameId, title, children, onExit }) {
    const navigate = useNavigate();
    const [shellState, setShellState] = useState('setup'); // 'setup', 'playing', 'post'
    const [scoreData, setScoreData] = useState(null);
    const [tuning, setTuning] = useState(null);
    const [liveAnnouncement, setLiveAnnouncement] = useState('');

    useEffect(() => {
        let mounted = true;
        getGameTuning(gameId).then(t => {
            if (mounted) setTuning(t);
        });

        const handleGameFinished = async (e) => {
            const data = e.detail || { score: 100, stars: 3, accuracy: 100 };
            setScoreData(data);

            const nextTuning = await updateGameResult(gameId, data);
            if (mounted) {
                setTuning(nextTuning);
                setShellState('post');
            }
        };

        document.addEventListener(GAME_RECORDED, handleGameFinished);
        return () => {
            mounted = false;
            document.removeEventListener(GAME_RECORDED, handleGameFinished);
        }
    }, [gameId]);

    // Accessibility: Broadcast game state and score updates to screen readers
    useEffect(() => {
        if (shellState === 'playing') {
            setLiveAnnouncement(`Started ${title}. Good luck!`);

            let lastAnnounced = '';
            const interval = setInterval(() => {
                const scoreNode = document.querySelector(`#view-game-${gameId} [id$="-score"], #view-game-${gameId} [data-pitch="score"], #view-game-${gameId} .game-score`);
                if (scoreNode && scoreNode.textContent) {
                    const text = scoreNode.textContent.trim();
                    if (text && text !== '0' && text !== lastAnnounced) {
                        lastAnnounced = text;
                        setLiveAnnouncement(`Score: ${text}`);
                    }
                }
            }, 5000); // 5s cadence to avoid overwhelming polite ARIA queues
            return () => clearInterval(interval);
        } else if (shellState === 'post') {
            setLiveAnnouncement(`Game finished. You scored ${scoreData?.score || 100} points!`);
        } else if (shellState === 'setup') {
            setLiveAnnouncement(`${title} game setup. Objective: Play and Learn!`);
        }
    }, [shellState, title, gameId, scoreData]);

    const handlePlayAgain = () => {
        setScoreData(null);
        setShellState('playing');
    };

    if (shellState === 'setup') {
        const handleBack = (e) => {
            if (onExit) {
                e.preventDefault();
                onExit();
            }
        };

        return (
            <section id={`view-game-${gameId}`} className="view is-active" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-4)', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
                    <Link to="/games" onClick={handleBack} className="back-btn glass" style={{ textDecoration: 'none', color: 'var(--color-text)', display: 'flex', alignItems: 'center', padding: '8px 16px', borderRadius: '24px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="24" height="24" style={{ marginRight: '8px' }}>
                            <path d="M15 18l-6-6 6-6" />
                        </svg> Back
                    </Link>
                </div>

                <picture>
                    <source srcSet="./assets/illustrations/mascot-focus.webp" type="image/webp" />
                    <img src="./assets/illustrations/mascot-focus.webp" alt="Panda coaching" style={{ width: '220px', marginBottom: 'var(--space-4)' }} decoding="async" loading="eager" />
                </picture>

                <Typography variant="h1" style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>
                    {title}
                </Typography>

                <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-4)', marginBottom: 'var(--space-6)', textAlign: 'center', borderRadius: '16px' }}>
                    <Typography variant="h3" style={{ marginBottom: '8px' }}>
                        {GAME_META[gameId]?.goal || 'Objective: Play and Learn!'}
                    </Typography>

                    {(() => {
                        const meta = GAME_META[gameId];
                        if (!meta) return null;
                        const allTips = [meta.tip, ...(meta.steps || []).map(s => s.cue)].filter(Boolean);
                        if (!allTips.length) return null;
                        const tip = allTips[Math.floor(Math.random() * allTips.length)];
                        return (
                            <p style={{ marginTop: '10px', fontStyle: 'italic', color: 'var(--color-text-muted)', fontSize: '1rem', lineHeight: '1.4' }}>
                                🐼 Panda Tip: {tip}
                            </p>
                        );
                    })()}

                    {(() => {
                        const packs = GAME_META[gameId]?.objectivePacks;
                        const objectives = packs?.core || packs?.foundation;
                        if (!objectives?.length) return null;
                        return (
                            <ol style={{ textAlign: 'left', margin: '12px 0 0', padding: '0 0 0 20px', fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: '1.6' }}>
                                {objectives.map((obj, i) => (
                                    <li key={obj.id || i} style={{ marginBottom: '4px' }}>
                                        <strong>{obj.label}</strong>
                                        {obj.minutes && <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px' }}>({obj.minutes} min)</span>}
                                    </li>
                                ))}
                            </ol>
                        );
                    })()}

                    {tuning && (
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: '16px', marginTop: '10px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Level {tuning.level}</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>&middot;</span>
                            <span style={{ textTransform: 'capitalize' }}>{tuning.difficulty}</span>
                        </div>
                    )}
                </div>

                <Button variant="primary" size="giant" onClick={() => setShellState('playing')} style={{ width: '80%', maxWidth: '340px' }}>
                    ▶ Start Game
                </Button>
            </section>
        );
    }

    if (shellState === 'post') {
        return (
            <section id={`view-game-${gameId}`} className="view is-active" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-4)', alignItems: 'center', justifyContent: 'center' }}>

                <div style={{ height: '80px', marginBottom: 'var(--space-4)' }}>
                    <StarRating rating={scoreData?.stars || 0} isNewEarn={true} />
                </div>

                <picture>
                    <source srcSet="./assets/illustrations/mascot-celebrate.webp" type="image/webp" />
                    <img src="./assets/illustrations/mascot-celebrate.webp" alt="Panda cheering" style={{ width: '220px', marginBottom: 'var(--space-4)' }} decoding="async" loading="eager" />
                </picture>

                <Typography variant="h1" style={{ fontSize: '3rem', marginBottom: 'var(--space-2)', textAlign: 'center' }}>
                    Amazing! You got {scoreData?.score || 100} points!
                </Typography>

                {tuning && (
                    <div className="glass" style={{ padding: '12px 24px', marginBottom: 'var(--space-6)', textAlign: 'center', borderRadius: '16px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Next Challenge:</div>
                        <strong>Level {tuning.level}</strong> ({tuning.difficulty})
                    </div>
                )}

                <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '440px' }}>
                    <Button variant="secondary" size="giant" onClick={handlePlayAgain} style={{ flex: 1 }}>
                        ↻ Retry
                    </Button>
                    <Button variant="primary" size="giant" onClick={() => onExit ? onExit() : navigate('/games')} style={{ flex: 1 }}>
                        ✓ Done
                    </Button>
                </div>
            </section>
        );
    }

    // shellState === 'playing'
    return (
        <ErrorBoundary>
            <PermissionGate permissionType="microphone" required={true}>
                <section id={`view-game-${gameId}`} style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden' }}>
                    {/* A11y Live Announcer */}
                    <div style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }} aria-live="polite" aria-atomic="true">
                        {liveAnnouncement}
                    </div>

                    <div style={{ position: 'absolute', top: 'env(safe-area-inset-top, 16px)', left: 'env(safe-area-inset-left, 16px)', zIndex: 9999 }}>
                        <Button variant="ghost" onClick={() => onExit ? onExit() : navigate('/games')} style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', padding: '8px 16px', borderRadius: '24px', color: 'var(--color-text)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="20" height="20" style={{ marginRight: '8px' }}>
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                            Exit
                        </Button>
                    </div>
                    {/* The Canvas Loader renders the full bleed game beneath the React GUI */}
                    {children}
                </section>
            </PermissionGate>
        </ErrorBoundary>
    );
}
