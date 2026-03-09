import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/primitives/Button.jsx';
import { Typography } from '../../components/primitives/Typography.jsx';
import { getLearningRecommendations } from '../../ml/recommendations.js';
import { getSongCatalog } from '../../songs/song-library.js';
import { ConfettiBurst } from '../../components/primitives/ConfettiBurst.jsx';
import { Checkmark } from '../../components/primitives/Checkmark.jsx';
import { useWakeLock } from '../../hooks/useWakeLock.js';
import { useSessionStorage } from '../../hooks/useStorage.js';
import { readJsonAsync } from '../../utils/storage-utils.js';
import { pickCoachSongId } from '../../coach/coach-song-contract.js';

// Embedded Views
import { GameRunnerView } from '../Games/GameRunnerView.jsx';
import { BowingView } from '../Tools/BowingView.jsx';
import { PostureView } from '../Tools/PostureView.jsx';
import { SongRunnerView } from '../Songs/SongRunnerView.jsx';
import styles from './CoachView.module.css';
import { getPublicAssetPath } from '../../utils/public-asset-path.js';

export function CoachView() {
    const navigate = useNavigate();
    const [missionPlan, setMissionPlan] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useSessionStorage('panda-violin:coach-step-index', 0);
    const [timeLeft, setTimeLeft] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [showResume, setShowResume] = useState(() => currentStepIndex > 0);
    const [embeddedSongId, setEmbeddedSongId] = useState(null);

    useEffect(() => {
        let mounted = true;
        getLearningRecommendations({ allowCached: true }).then(plan => {
            if (mounted && plan?.mission?.steps) {
                setMissionPlan(plan.mission);
            }
        }).catch(err => console.error("CoachView ML fetch failed:", err));
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        let mounted = true;

        const loadEmbeddedSong = async () => {
            try {
                const [catalog, progressState] = await Promise.all([
                    getSongCatalog(),
                    readJsonAsync('panda-violin:song-progress-v2', null),
                ]);
                if (!mounted) return;
                setEmbeddedSongId(pickCoachSongId({
                    catalog,
                    progressState,
                    preferredLabel: missionPlan?.steps?.[currentStepIndex]?.label || '',
                }));
            } catch {
                if (mounted) setEmbeddedSongId('open_strings');
            }
        };

        loadEmbeddedSong();
        return () => { mounted = false; };
    }, [currentStepIndex, missionPlan]);

    // Phase 35: Abstracted Wake Lock
    useWakeLock(true);

    const isComplete = missionPlan && currentStepIndex >= missionPlan.steps.length;

    useEffect(() => {
        if (isComplete) {
            sessionStorage.removeItem('panda-violin:coach-step-index');
        }
    }, [isComplete]);

    useEffect(() => {
        if (missionPlan && !isComplete && timeLeft === null) {
            setTimeLeft(missionPlan.steps[currentStepIndex].minutes * 60);
        }
    }, [missionPlan, currentStepIndex, timeLeft, isComplete]);

    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || isComplete || isPaused) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setTimeout(handleNextStep, 0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isComplete, isPaused]);

    if (!missionPlan) {
        return (
            <div className="view is-active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="h3">Preparing your mission...</Typography>
            </div>
        );
    }

    if (isComplete) {
        const totalMinutes = missionPlan.steps.reduce((acc, s) => acc + s.minutes, 0);
        return (
            <section className={`view ${styles.coachView}`} aria-label="Practice Complete" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-4)', position: 'relative' }}>
                <ConfettiBurst />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'var(--space-4)', flex: 1, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-2)' }}>
                        <Checkmark size={40} color="var(--color-success)" />
                        <Typography variant="h2" style={{ color: 'var(--color-primary)', fontSize: '2.5rem', margin: 0 }}>Excellent Focus!</Typography>
                    </div>
                    <Typography style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>You practiced for {totalMinutes} minutes.</Typography>
                    <img src={getPublicAssetPath('./assets/illustrations/mascot-happy.webp')} alt="Happy Panda" style={{ height: '200px', objectFit: 'contain', margin: 'var(--space-4) 0' }} />
                    <Button variant="primary" size="giant" as={Link} to="/home" style={{ marginTop: 'var(--space-6)', width: '80%', maxWidth: '300px' }}>
                        Back to Home
                    </Button>
                </div>
            </section>
        );
    }

    const currentStep = missionPlan.steps[currentStepIndex] || missionPlan.steps[0];

    const handleNextStep = () => {
        setTimeLeft(null);
        setIsPaused(false);
        setCurrentStepIndex(prev => prev + 1);
    };

    const handleSkip = () => {
        handleNextStep();
    };

    const renderEmbeddedStep = () => {
        const actionStr = (currentStep.action || currentStep.cta || '').toString();

        // We use a CSS wrapper to force the embedded tools to look flush
        const wrapperStyle = { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.1)' };

        if (actionStr.startsWith('view-game-')) {
            const gameId = actionStr.replace('view-game-', '');
            return (
                <div style={wrapperStyle}>
                    <GameRunnerView propGameId={gameId} onExit={handleNextStep} />
                </div>
            );
        }
        if (actionStr === 'view-bowing') {
            return (
                <div style={wrapperStyle}>
                    <BowingView onComplete={handleNextStep} />
                </div>
            );
        }
        if (actionStr === 'view-posture') {
            return (
                <div style={wrapperStyle}>
                    <PostureView onComplete={handleNextStep} />
                </div>
            );
        }
        if (actionStr === 'view-songs') {
            return (
                <div style={wrapperStyle}>
                    <SongRunnerView propSongId={embeddedSongId || 'open_strings'} onComplete={handleNextStep} />
                </div>
            );
        }

        return (
            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--color-surface)', borderRadius: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                <Typography variant="h3">Next up: {currentStep.label}</Typography>
                <Button variant="primary" size="giant" onClick={handleNextStep}>Complete Step</Button>
            </div>
        );
    };

    const mins = Math.floor((timeLeft || 0) / 60);
    const secs = (timeLeft || 0) % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    const totalSecs = currentStep ? currentStep.minutes * 60 : 1;
    const fillPercent = Math.max(0, Math.min(100, 100 - ((timeLeft || 0) / totalSecs) * 100));

    return (
        <section id="view-coach" className={`view is-active coach-runner-view ${styles.coachView}`} aria-label="Practice Runner" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-4)' }}>

            {showResume && missionPlan && (
                <div style={{ background: 'var(--color-primary)', color: 'white', padding: '12px 16px', borderRadius: '12px', marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>🐼 Continue where you left off? (Step {currentStepIndex + 1}/{missionPlan.steps.length})</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="ghost" onClick={() => setShowResume(false)} style={{ color: 'white', fontSize: '0.85rem', padding: '6px 12px' }}>Resume</Button>
                        <Button variant="ghost" onClick={() => { setCurrentStepIndex(0); setTimeLeft(null); setShowResume(false); }} style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', padding: '6px 12px' }}>Start Over</Button>
                    </div>
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <Button variant="ghost" onClick={() => navigate('/home')} style={{ color: 'var(--color-text)', padding: '8px 16px', background: 'var(--color-surface)', borderRadius: '24px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ marginRight: '6px' }}>
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    End Session
                </Button>

                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>
                    Step {currentStepIndex + 1} of {missionPlan.steps.length}
                </div>
            </div>

            {/* Runner Progress Bar */}
            <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
                <div style={{ width: `${(currentStepIndex / missionPlan.steps.length) * 100}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.4s ease-out' }} />
            </div>

            <div className="practice-focus" style={{ marginBottom: 'var(--space-4)' }}>
                <Typography variant="h2" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{currentStep.label}</Typography>

                {/* Panda Coaching Strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-alt)', padding: '8px 14px', borderRadius: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '1.4rem' }}>🐼</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        {currentStep.coachCue || currentStep.tip || (
                            timeLeft !== null && timeLeft > 0 ? 'Great focus! Keep going...' : 'Tap Start when ready!'
                        )}
                    </span>
                </div>

                {/* Visual Timer Fill Bar */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', marginBottom: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${fillPercent}%`, height: '100%', background: '#4caf50', transition: 'width 1s linear' }} />
                </div>

                <div className="focus-status" style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--color-bg-alt)', padding: '6px 12px', borderRadius: '16px', color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    <span className="focus-ring" style={{ marginRight: '6px' }}>⏱</span>
                    <span aria-atomic="true">
                        {timeLeft !== null ? `${timeStr} - ${isPaused ? 'Paused' : 'Practicing...'}` : 'Ready!'}
                        {timeLeft !== null && <span className="sr-only" style={{ display: 'none' }}>Ready!</span>}
                    </span>
                </div>

                {/* Pause/Resume + Skip */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    {timeLeft !== null && (
                        <Button variant="ghost" onClick={() => setIsPaused(p => !p)} style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem' }}>
                            {isPaused ? '▶ Resume' : '⏸ Pause'}
                        </Button>
                    )}
                    <Button variant="ghost" onClick={handleSkip} style={{ padding: '6px 16px', borderRadius: '24px', fontSize: '0.85rem' }}>
                        Skip →
                    </Button>
                </div>
            </div>

            {renderEmbeddedStep()}
        </section>
    );
}
