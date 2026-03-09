import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router';
import { useHardwareCapabilities } from './context/HardwareCapabilitiesContext.jsx';
import { useLocalStorage } from './hooks/useStorage.js';
import { OnboardingRoute } from './app/lazy-route-components.jsx';
import { hydrateLegacyView } from './app/legacy-view-runtime.js';

const LEGACY_HYDRATION_VIEW_IDS = new Set([
    'view-tuner',
]);

const getLegacyViewHash = (pathname) => {
    if (!pathname || pathname === '/') return '#view-home';
    if (pathname === '/home') return '#view-home';
    if (pathname === '/coach') return '#view-coach';
    if (pathname === '/onboarding') return '#view-onboarding';
    if (pathname === '/wins') return '#view-progress';
    if (pathname === '/games') return '#view-games';
    if (pathname.startsWith('/games/')) return `#view-game-${pathname.split('/')[2] || ''}`;
    if (pathname === '/tools') return '#view-trainer';
    if (pathname === '/tools/tuner') return '#view-tuner';
    if (pathname === '/tools/metronome') return '#view-metronome';
    if (pathname === '/tools/drone') return '#view-drone';
    if (pathname === '/tools/bowing') return '#view-bowing';
    if (pathname === '/tools/posture') return '#view-posture';
    if (pathname === '/songs') return '#view-songs';
    if (pathname.startsWith('/songs/')) {
        const songId = pathname.split('/')[2] || '';
        return songId ? `#view-song-${songId}` : '#view-songs';
    }
    if (pathname === '/parent') return '#view-parent';
    if (pathname === '/parent/review') return '#view-analysis';
    if (pathname === '/parent/goals') return '#view-parent';
    if (pathname === '/parent/checklist') return '#view-parent';
    if (pathname === '/parent/recordings') return '#view-parent';
    if (pathname === '/parent/data') return '#view-backup';
    if (pathname === '/parent/settings') return '#view-parent';
    if (pathname === '/settings') return '#view-settings';
    if (pathname === '/backup') return '#view-backup';
    if (pathname === '/help' || pathname === '/support/help') return '#view-help';
    if (pathname === '/about' || pathname === '/support/about') return '#view-about';
    if (pathname === '/privacy' || pathname === '/support/privacy') return '#view-privacy';
    return '';
};

export function AppShell() {
    const capabilities = useHardwareCapabilities();
    const location = useLocation();

    // Phase 35: Abstract Storage Hooks
    const [onboardingComplete, setOnboardingComplete] = useLocalStorage('onboarding-complete', false);
    const needsOnboarding = onboardingComplete !== true && onboardingComplete !== 'true';
    const [isChecking, setIsChecking] = useState(true);

    // Focus mode: hide bottom nav during practice and in-game
    const isFocusMode = /^\/(coach|games\/[^/]+)$/.test(location.pathname);

    useEffect(() => {
        setIsChecking(false);

        // Legacy hash redirect (spec line 128)
        const hash = window.location.hash;
        if (hash && hash.startsWith('#view-')) {
            const HASH_MAP = {
                '#view-home': '/home',
                '#view-coach': '/coach',
                '#view-games': '/games',
                '#view-songs': '/songs',
                '#view-tuner': '/tools/tuner',
                '#view-trainer': '/tools',
                '#view-progress': '/wins',
                '#view-analysis': '/parent/review',
                '#view-parent': '/parent',
                '#view-settings': '/settings',
                '#view-backup': '/parent/data',
                '#view-help': '/support/help',
                '#view-about': '/support/about',
                '#view-privacy': '/support/privacy',
                '#view-bowing': '/tools/bowing',
                '#view-posture': '/tools/posture',
                '#view-onboarding': '/home',
                '#view-metronome': '/tools/metronome',
                '#view-ear-trainer': '/games/ear-trainer',
                '#view-checklist': '/parent/checklist',
            };
            const target = HASH_MAP[hash];
            if (target) {
                window.history.replaceState(null, '', target);
                window.location.hash = '';
            }
        }

        // iOS Safari contextmenu suppression (spec line 2513)
        // Prevents native context menu on long-press so custom long-press actions work
        const suppressContextMenu = (e) => e.preventDefault();
        document.addEventListener('contextmenu', suppressContextMenu);

        return () => {
            document.removeEventListener('contextmenu', suppressContextMenu);
        };
    }, []);

    useEffect(() => {
        if (isChecking) return;

        const nextHash = getLegacyViewHash(location.pathname);
        if (!nextHash || window.location.hash === nextHash) return;

        const oldURL = window.location.href;
        window.history.replaceState(
            window.history.state,
            '',
            `${window.location.pathname}${window.location.search}${nextHash}`,
        );
        window.dispatchEvent(new HashChangeEvent('hashchange', {
            oldURL,
            newURL: window.location.href,
        }));
    }, [isChecking, location.pathname, location.search]);

    useEffect(() => {
        if (isChecking || needsOnboarding) return;

        const nextHash = getLegacyViewHash(location.pathname);
        const viewId = nextHash.replace(/^#/, '');
        if (!viewId || !LEGACY_HYDRATION_VIEW_IDS.has(viewId)) return;

        hydrateLegacyView(viewId, `${location.pathname}${location.search}`)
            .catch((error) => {
                console.warn(`[AppShell] Failed to hydrate legacy view "${viewId}"`, error);
            });
    }, [isChecking, needsOnboarding, location.pathname, location.search]);

    if (isChecking) return <div style={{ height: '100dvh', background: 'var(--color-bg)' }}></div>;

    const lazyRouteFallback = <div style={{ flex: 1 }} aria-hidden="true" />;

    if (needsOnboarding) {
        return (
            <div data-theme={capabilities.theme} style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
                <Suspense fallback={lazyRouteFallback}>
                    <OnboardingRoute onComplete={() => setOnboardingComplete(true)} />
                </Suspense>
            </div>
        );
    }

    return (
        <div
            className="react-shell"
            style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}
            data-theme={capabilities.theme}
        >
            <header className="app-topbar glass" role="banner">
                <div className="app-topbar-brand">
                    <span className="app-topbar-title">Panda Violin</span>
                </div>
                <NavLink to="/parent" className="parent-zone-lock" data-parent-lock aria-label="Open Parent Zone">
                    <span className="parent-zone-lock-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 8h-1V6a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM9 8V6a3 3 0 1 1 6 0v2H9Z" />
                        </svg>
                    </span>
                    <span className="parent-zone-lock-label">For Grown-Ups</span>
                </NavLink>
            </header>

            <main id="main-content" className="main-content" style={{ flex: 1, position: 'relative', paddingTop: '100px' }}>
                <Suspense fallback={lazyRouteFallback}>
                    <Outlet />
                </Suspense>
            </main>

            {!isFocusMode && (
                <nav className="bottom-nav glass">
                    {[
                        { to: '/home', label: 'Home', d: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
                        { to: '/songs', label: 'Songs', d: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z' },
                        { to: '/games', label: 'Games', d: 'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H9v2H7v-2H5v-2h2V9h2v2h2v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z' },
                        { to: '/tools', label: 'Tools', d: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z' },
                        { to: '/wins', label: 'Wins', d: 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z' },
                    ].map(({ to, label, d }) => (
                        <NavLink key={to} to={to} viewTransition className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}>
                            <span className="nav-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d={d} />
                                </svg>
                            </span>
                            <span className="nav-label">{label}</span>
                        </NavLink>
                    ))}
                </nav>
            )}
        </div>
    );
}
