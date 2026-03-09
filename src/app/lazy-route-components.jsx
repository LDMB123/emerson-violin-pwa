import React, { lazy } from 'react';

const lazyNamed = (loader, exportName) => lazy(() => loader().then((module) => ({ default: module[exportName] })));

const LazyCoachView = lazyNamed(() => import('../views/Coach/CoachView.jsx'), 'CoachView');
const LazyGamesView = lazyNamed(() => import('../views/Games/GamesView.jsx'), 'GamesView');
const LazyGameRunnerView = lazyNamed(() => import('../views/Games/GameRunnerView.jsx'), 'GameRunnerView');
const LazyWinsView = lazyNamed(() => import('../views/Wins/WinsView.jsx'), 'WinsView');
const LazyToolsHubView = lazyNamed(() => import('../views/Tools/ToolsHubView.jsx'), 'ToolsHubView');
const LazyTunerView = lazyNamed(() => import('../views/Tools/TunerView.jsx'), 'TunerView');
const LazyBowingView = lazyNamed(() => import('../views/Tools/BowingView.jsx'), 'BowingView');
const LazyPostureView = lazyNamed(() => import('../views/Tools/PostureView.jsx'), 'PostureView');
const LazyMetronomeView = lazyNamed(() => import('../views/Tools/MetronomeView.jsx'), 'MetronomeView');
const LazyDroneView = lazyNamed(() => import('../views/Tools/DroneView.jsx'), 'DroneView');
const LazySongsView = lazyNamed(() => import('../views/Songs/SongsView.jsx'), 'SongsView');
const LazySongDetailView = lazyNamed(() => import('../views/Songs/SongDetailView.jsx'), 'SongDetailView');
const LazySongRunnerView = lazyNamed(() => import('../views/Songs/SongRunnerView.jsx'), 'SongRunnerView');
const LazyChildSettingsView = lazyNamed(() => import('../views/Settings/ChildSettingsView.jsx'), 'ChildSettingsView');
const LazyOnboardingView = lazyNamed(() => import('../views/Onboarding/OnboardingView.jsx'), 'OnboardingView');
const LazyParentView = lazyNamed(() => import('../views/Parent/ParentView.jsx'), 'ParentView');
const LazyReviewView = lazyNamed(() => import('../views/Parent/ReviewView.jsx'), 'ReviewView');
const LazyBackupView = lazyNamed(() => import('../views/Settings/BackupView.jsx'), 'BackupView');
const LazyHelpView = lazyNamed(() => import('../views/Settings/HelpView.jsx'), 'HelpView');
const LazyAboutView = lazyNamed(() => import('../views/Settings/AboutView.jsx'), 'AboutView');
const LazyPrivacyView = lazyNamed(() => import('../views/Settings/PrivacyView.jsx'), 'PrivacyView');

export function OnboardingRoute(props) {
    return <LazyOnboardingView {...props} />;
}

export function CoachRoute() {
    return <LazyCoachView />;
}

export function GamesRoute() {
    return <LazyGamesView />;
}

export function GameRunnerRoute() {
    return <LazyGameRunnerView />;
}

export function WinsRoute() {
    return <LazyWinsView />;
}

export function ToolsHubRoute() {
    return <LazyToolsHubView />;
}

export function TunerRoute() {
    return <LazyTunerView />;
}

export function BowingRoute() {
    return <LazyBowingView />;
}

export function PostureRoute() {
    return <LazyPostureView />;
}

export function MetronomeRoute() {
    return <LazyMetronomeView />;
}

export function DroneRoute() {
    return <LazyDroneView />;
}

export function SongsRoute() {
    return <LazySongsView />;
}

export function SongDetailRoute() {
    return <LazySongDetailView />;
}

export function SongRunnerRoute() {
    return <LazySongRunnerView />;
}

export function ParentRoute() {
    return <LazyParentView />;
}

export function ParentGoalsRoute() {
    return <LazyParentView defaultTab="goals" />;
}

export function ParentChecklistRoute() {
    return <LazyParentView defaultTab="checklist" />;
}

export function ParentRecordingsRoute() {
    return <LazyParentView defaultTab="recordings" />;
}

export function ParentDataRoute() {
    return <LazyParentView defaultTab="data" />;
}

export function ParentSettingsRoute() {
    return <LazyParentView defaultTab="settings" />;
}

export function ReviewRoute() {
    return <LazyReviewView />;
}

export function ChildSettingsRoute() {
    return <LazyChildSettingsView />;
}

export function BackupRoute() {
    return <LazyBackupView />;
}

export function HelpRoute() {
    return <LazyHelpView />;
}

export function AboutRoute() {
    return <LazyAboutView />;
}

export function PrivacyRoute() {
    return <LazyPrivacyView />;
}
