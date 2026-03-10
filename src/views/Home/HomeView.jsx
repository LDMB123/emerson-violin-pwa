import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../../components/primitives/Button.jsx';
import { Card } from '../../components/primitives/Card.jsx';
import { useProgressSummary } from '../../hooks/useProgressSummary.js';
import { getLearningRecommendations } from '../../ml/recommendations.js';
import { PandaSpeech } from '../../components/primitives/PandaSpeech.jsx';
import { scheduleBackgroundTask } from '../../utils/idle-task.js';
import styles from './HomeView.module.css';
import { setBadge } from '../../notifications/badging.js';
import { getPublicAssetPath } from '../../utils/public-asset-path.js';
import { readChildName } from '../../utils/child-profile.js';
import { resolveDailyLessonPlan } from '../../utils/daily-lesson-plan.js';
import { getPracticeSessionState } from '../../utils/practice-session.js';

export function HomeView() {
    const { summary } = useProgressSummary();
    const navigate = useNavigate();
    const streak = summary?.streakDays ?? 0;
    const childName = readChildName();

    // App Badge: show badge if no practice today, clear on visit (spec line 348)
    useEffect(() => {
        const sessionState = getPracticeSessionState();
        setBadge(sessionState.practicedToday ? 0 : 1);
    }, []);

    // Mission states: 'none', 'incomplete', 'complete'
    const [missionState, setMissionState] = useState('incomplete');
    const [streakAtRisk, setStreakAtRisk] = useState(false);
    const [hasCompletedFirstMission, setHasCompletedFirstMission] = useState(false);
    const [missionPlan, setMissionPlan] = useState(() => resolveDailyLessonPlan(null, { childName }));
    const missionSummary = missionPlan?.steps
        ?.slice(0, 3)
        .map((step) => step?.label)
        .filter(Boolean)
        .join(' • ');

    useEffect(() => {
        let mounted = true;

        // Defer mission-plan hydration so the home shell can paint before loading ML helpers.
        scheduleBackgroundTask(() => {
            getLearningRecommendations({ allowCached: true })
                .then((recommendations) => {
                    if (mounted) {
                        setMissionPlan(resolveDailyLessonPlan(recommendations, { childName }));
                    }
                })
                .catch((err) => console.error('Could not fetch mission plan', err));
        }, {
            delay: 180,
            delayBeforeIdle: true,
            idleTimeout: 1200,
        });

        const sessionState = getPracticeSessionState();
        if (mounted) {
            setMissionState(sessionState.practicedToday ? 'complete' : 'incomplete');
            setStreakAtRisk(sessionState.streakAtRisk);
            setHasCompletedFirstMission(sessionState.hasCompletedFirstMission);
        }

        return () => { mounted = false; };
    }, [childName]);

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
    if (!hasCompletedFirstMission) {
        pandaSpeech = childName
            ? `${childName}, your first mission is ready.`
            : "Your first mission is ready.";
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

            <div className={styles.welcomeCopy}>
                <h1 className={styles.welcomeTitle}>
                    {childName ? `Hi, ${childName}!` : 'Hi there!'}
                </h1>
                <p className={styles.welcomeBody}>
                    Start with one calm mission, then jump into songs, games, or warm-up tools.
                </p>
            </div>

            <div className={styles.homeHero}>
                <img
                    src={getPublicAssetPath('./assets/illustrations/mascot-playing-violin.png')}
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
                        <p className={styles.missionMeta}>
                            {missionPlan.totalMinutes} min · {missionPlan.steps.length} activities
                        </p>
                    </div>
                </div>

                {missionState === 'incomplete' && missionSummary && (
                    <p className={styles.missionSummary}>{missionSummary}</p>
                )}

                <Button
                    data-start-practice
                    variant="primary"
                    size="giant"
                    onClick={() => navigate('/coach', { replace: true })}
                    className={styles.startPracticeButton}
                >
                    ▶ {missionState === 'complete' ? 'Practice Again' : "Start Today's Mission"}
                </Button>

                <div className={styles.missionSteps} aria-label="Mission steps">
                    {missionPlan.steps.map((step) => (
                        <span key={step.id} className={styles.missionStepChip}>
                            {step.minutes} min · {step.label}
                        </span>
                    ))}
                </div>
            </Card>

            <div className={styles.quickGrid}>
                <Card as={Link} to="/tools" className={styles.quickCard}>
                    <div className={styles.quickIcon}>🛠️</div>
                    <strong className={styles.quickLabel}>Warm Up</strong>
                </Card>
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
