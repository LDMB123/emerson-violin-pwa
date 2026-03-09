import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { readJsonAsync } from '../../utils/storage-utils.js';
import { Button } from '../../components/primitives/Button.jsx';
import { Card } from '../../components/primitives/Card.jsx';
import { useProgressSummary } from '../../hooks/useProgressSummary.js';
import { getLearningRecommendations } from '../../ml/recommendations.js';
import { PandaSpeech } from '../../components/primitives/PandaSpeech.jsx';
import styles from './HomeView.module.css';
import { setBadge } from '../../notifications/badging.js';

export function HomeView() {
    const { summary } = useProgressSummary();
    const navigate = useNavigate();
    const streak = summary?.streakDays ?? 0;

    // App Badge: show badge if no practice today, clear on visit (spec line 348)
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const lastPractice = localStorage.getItem('panda-violin:last-practice-date');
        if (lastPractice === today) {
            setBadge(0);
        } else {
            setBadge(1);
        }
    }, []);

    // Mission states: 'none', 'incomplete', 'complete'
    const [missionState, setMissionState] = useState('incomplete');
    const [streakAtRisk, setStreakAtRisk] = useState(false);
    const [missionPlan, setMissionPlan] = useState(null);
    const missionSummary = missionPlan?.steps
        ?.slice(0, 3)
        .map((step) => step?.label)
        .filter(Boolean)
        .join(' • ');

    useEffect(() => {
        let mounted = true;

        // Fetch real ML recommendations for the mission
        getLearningRecommendations({ allowCached: true })
            .then((plan) => {
                if (mounted && plan?.mission?.steps) {
                    setMissionPlan(plan.mission);
                }
            })
            .catch((err) => console.error('Could not fetch mission plan', err));

        // Determine complete vs incomplete based on daily login
        Promise.all([
            readJsonAsync('last-practice-date'),
            readJsonAsync('last-practice-time')
        ]).then(([lastPracticeStr, lastTime]) => {
            if (!mounted) return;
            const todayStr = new Date().toDateString();

            if (lastPracticeStr === todayStr) {
                setMissionState('complete');
            } else {
                setMissionState('incomplete');
            }

            const hoursSinceLastPractice = lastTime
                ? (Date.now() - parseInt(lastTime, 10)) / (1000 * 60 * 60)
                : 0;

            if (hoursSinceLastPractice > 24 && hoursSinceLastPractice < 48) {
                setStreakAtRisk(true);
            }
        });

        return () => { mounted = false; };
    }, []);

    // Determine Mascot Pose & Speech based on spec
    let mascotPose = 'happy';
    let pandaSpeech = missionPlan?.coachCue || "Ready for today's practice?";

    if (missionState === 'complete') {
        mascotPose = 'celebrate';
        pandaSpeech = "Play more or see your wins!";
    } else if (streakAtRisk) {
        mascotPose = 'encourage';
        pandaSpeech = `One more day and you'll hit ${streak + 1}🔥!`;
    } else if (missionState === 'incomplete') {
        mascotPose = 'focus';
        pandaSpeech = "Welcome back! You were doing great.";
    }

    // Default to a new user state if they just finished onboarding
    if (!localStorage.getItem('first-mission-completed')) {
        pandaSpeech = "Let's set up your first practice!";
        mascotPose = 'happy';
    }

    return (
        <section id="view-home" className={`view is-active ${styles.homeView}`} aria-label="Home">
            <div className={styles.homeTopRow}>
                <Link to="/settings" aria-label="Settings" className={styles.settingsButton}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </Link>
                <div className={styles.streakPill}>
                    🔥 {streak}
                </div>
            </div>

            <div className={styles.homeHero}>
                <img
                    src="/assets/illustrations/mascot-playing-violin.png"
                    alt="Panda playing violin"
                    className={styles.homeMascotArt}
                    width="640"
                    height="640"
                    data-home-mascot
                />
                <div className={styles.homeSpeechWrap}>
                    <PandaSpeech text={pandaSpeech} size="lg" />
                </div>
            </div>

            <Card className={styles.missionCard}>
                <div className={styles.missionHeader}>
                    <div className={styles.missionIcon}>🎵</div>
                    <div className={styles.missionHeading}>
                        <h3 className={styles.missionTitle}>Today's Mission</h3>
                        {missionPlan ? (
                            <p className={styles.missionMeta}>
                                {missionPlan.steps.reduce((acc, s) => acc + (typeof s.minutes === 'number' ? s.minutes : 1), 0)} min · {missionPlan.steps.length} activities
                            </p>
                        ) : (
                            <p className={styles.missionMeta}>Loading plan...</p>
                        )}
                    </div>
                </div>

                {missionState === 'incomplete' && missionPlan && missionSummary && (
                    <p className={styles.missionSummary}>{missionSummary}</p>
                )}

                <Button
                    data-start-practice
                    variant="primary"
                    size="giant"
                    onClick={() => navigate('/coach', { replace: true })}
                    className={styles.startPracticeButton}
                    disabled={!missionPlan}
                >
                    ▶ {missionState === 'complete' ? 'Practice Again' : 'Start Practice'}
                </Button>
            </Card>

            <div className={styles.quickGrid}>
                <Card as={Link} to="/songs" className={styles.quickCard}>
                    <div className={styles.quickIcon}>🎵</div>
                    <strong className={styles.quickLabel}>Songs</strong>
                </Card>
                <Card as={Link} to="/games" className={styles.quickCard}>
                    <div className={styles.quickIcon}>🎮</div>
                    <strong className={styles.quickLabel}>Games</strong>
                </Card>
            </div>
        </section>
    );
}
