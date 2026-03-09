import { lazyNamedWithRetry } from './lazy-import.js';

const LazyCoachView = lazyNamedWithRetry(() => import('../views/Coach/CoachView.jsx'), 'CoachView');
const LazyGamesView = lazyNamedWithRetry(() => import('../views/Games/GamesView.jsx'), 'GamesView');
const LazyGameRunnerView = lazyNamedWithRetry(() => import('../views/Games/GameRunnerView.jsx'), 'GameRunnerView');
const LazyWinsView = lazyNamedWithRetry(() => import('../views/Wins/WinsView.jsx'), 'WinsView');
const LazyToolsHubView = lazyNamedWithRetry(() => import('../views/Tools/ToolsHubView.jsx'), 'ToolsHubView');
const LazyTunerView = lazyNamedWithRetry(() => import('../views/Tools/TunerView.jsx'), 'TunerView');
const LazyBowingView = lazyNamedWithRetry(() => import('../views/Tools/BowingView.jsx'), 'BowingView');
const LazyPostureView = lazyNamedWithRetry(() => import('../views/Tools/PostureView.jsx'), 'PostureView');
const LazyMetronomeView = lazyNamedWithRetry(() => import('../views/Tools/MetronomeView.jsx'), 'MetronomeView');
const LazyDroneView = lazyNamedWithRetry(() => import('../views/Tools/DroneView.jsx'), 'DroneView');
const LazySongsView = lazyNamedWithRetry(() => import('../views/Songs/SongsView.jsx'), 'SongsView');
const LazySongDetailView = lazyNamedWithRetry(() => import('../views/Songs/SongDetailView.jsx'), 'SongDetailView');
const LazySongRunnerView = lazyNamedWithRetry(() => import('../views/Songs/SongRunnerView.jsx'), 'SongRunnerView');
const LazyChildSettingsView = lazyNamedWithRetry(() => import('../views/Settings/ChildSettingsView.jsx'), 'ChildSettingsView');
const LazyOnboardingView = lazyNamedWithRetry(() => import('../views/Onboarding/OnboardingView.jsx'), 'OnboardingView');
const LazyParentView = lazyNamedWithRetry(() => import('../views/Parent/ParentView.jsx'), 'ParentView');
const LazyReviewView = lazyNamedWithRetry(() => import('../views/Parent/ReviewView.jsx'), 'ReviewView');
const LazyBackupView = lazyNamedWithRetry(() => import('../views/Settings/BackupView.jsx'), 'BackupView');
const LazyHelpView = lazyNamedWithRetry(() => import('../views/Settings/HelpView.jsx'), 'HelpView');
const LazyAboutView = lazyNamedWithRetry(() => import('../views/Settings/AboutView.jsx'), 'AboutView');
const LazyPrivacyView = lazyNamedWithRetry(() => import('../views/Settings/PrivacyView.jsx'), 'PrivacyView');

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
