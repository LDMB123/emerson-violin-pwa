import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './AppShell.jsx';
import { HomeView } from './views/Home/HomeView.jsx';
import {
    AboutRoute,
    BackupRoute,
    BowingRoute,
    ChildSettingsRoute,
    CoachRoute,
    DroneRoute,
    GameRunnerRoute,
    GamesRoute,
    HelpRoute,
    MetronomeRoute,
    OnboardingRoute,
    ParentChecklistRoute,
    ParentDataRoute,
    ParentGoalsRoute,
    ParentRecordingsRoute,
    ParentRoute,
    ParentSettingsRoute,
    PostureRoute,
    PrivacyRoute,
    ReviewRoute,
    SongDetailRoute,
    SongRunnerRoute,
    SongsRoute,
    ToolsHubRoute,
    TunerRoute,
    WinsRoute,
} from './app/lazy-route-components.jsx';

/**
 * Phase 1-9 Router Configuration
 * Maps native React views and legacy game/song runners
 */
export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppShell />,
        errorElement: <Navigate to="/home" replace />, // Failsafe top-level boundary
        children: [
            // Root
            { path: '', element: <Navigate to="/home" replace /> },

            // Core Habit Loop
            { path: 'home', element: <HomeView /> },
            { path: 'coach', element: <CoachRoute /> },
            { path: 'onboarding', element: <OnboardingRoute /> },

            // Progress
            { path: 'wins', element: <WinsRoute /> },

            // Catalogs
            { path: 'games', element: <GamesRoute /> },
            { path: 'games/:gameId', element: <GameRunnerRoute /> },

            // Tools
            { path: 'tools', element: <ToolsHubRoute /> },
            { path: 'tools/tuner', element: <TunerRoute /> },
            { path: 'tools/bowing', element: <BowingRoute /> },
            { path: 'tools/posture', element: <PostureRoute /> },
            { path: 'tools/metronome', element: <MetronomeRoute /> },
            { path: 'tools/drone', element: <DroneRoute /> },

            // Content
            { path: 'songs', element: <SongsRoute /> },
            { path: 'songs/:songId', element: <SongDetailRoute /> },
            { path: 'songs/:songId/play', element: <SongRunnerRoute /> },

            // Parent & Utility
            { path: 'parent', element: <ParentRoute /> },
            { path: 'parent/review', element: <ReviewRoute /> },
            { path: 'parent/goals', element: <ParentGoalsRoute /> },
            { path: 'parent/checklist', element: <ParentChecklistRoute /> },
            { path: 'parent/recordings', element: <ParentRecordingsRoute /> },
            { path: 'parent/data', element: <ParentDataRoute /> },
            { path: 'parent/settings', element: <ParentSettingsRoute /> },
            { path: 'settings', element: <ChildSettingsRoute /> },
            { path: 'backup', element: <BackupRoute /> },
            { path: 'help', element: <HelpRoute /> },
            { path: 'about', element: <AboutRoute /> },
            { path: 'privacy', element: <PrivacyRoute /> },
            { path: 'support/help', element: <HelpRoute /> },
            { path: 'support/about', element: <AboutRoute /> },
            { path: 'support/privacy', element: <PrivacyRoute /> },

            // Fallback
            { path: '*', element: <Navigate to="/home" replace /> }
        ]
    }
]);
