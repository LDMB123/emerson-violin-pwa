import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './routes.jsx';
import { UserPreferencesProvider } from './context/UserPreferencesContext.jsx';
import { HardwareCapabilitiesProvider } from './context/HardwareCapabilitiesContext.jsx';
import { whenReady } from './utils/dom-ready.js';
import { registerAppServiceWorker } from './app/service-worker-bootstrap.js';

// Global Platform Dependencies
import './notifications/badging.js';
import { init as initWebVitals } from './platform/web-vitals.js';

import { CoachOverlay } from './components/shared/CoachOverlay.jsx';

// Pre-flight Service Worker Registration 
registerAppServiceWorker();

whenReady(() => {
    const rootEl = document.getElementById('react-root');
    if (!rootEl) {
        console.error('CRITICAL: Could not locate react-root DOM mount point.');
        return;
    }

    // Initialize Global Diagnostics
    initWebVitals();

    // Mount React App Shell Architecture
    const reactRoot = createRoot(rootEl);
    reactRoot.render(
        <HardwareCapabilitiesProvider>
            <UserPreferencesProvider>
                <RouterProvider router={router} />
                <CoachOverlay />
            </UserPreferencesProvider>
        </HardwareCapabilitiesProvider>
    );
    window.__PANDA_APP_READY__ = true;
});
