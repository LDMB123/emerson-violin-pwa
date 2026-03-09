import React, { createContext, useContext, useState, useEffect } from 'react';

const HardwareCapabilitiesContext = createContext({});

// Using a simplified version of our platform-utils for the initial context state
export function HardwareCapabilitiesProvider({ children }) {
    const [capabilities, setCapabilities] = useState({
        isStandalone: false,
        isIOS: false,
        isOnline: navigator.onLine,
        theme: 'light', // system theme preference
        reducedMotion: false,
    });

    useEffect(() => {
        // Initial detection
        const ua = window.navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        setCapabilities(prev => ({
            ...prev,
            isIOS,
            isStandalone,
            theme: prefersDark ? 'dark' : 'light',
            reducedMotion: prefersReducedMotion
        }));

        // Listeners
        const handleOnline = () => setCapabilities(p => ({ ...p, isOnline: true }));
        const handleOffline = () => setCapabilities(p => ({ ...p, isOnline: false }));

        const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = (e) => setCapabilities(p => ({ ...p, theme: e.matches ? 'dark' : 'light' }));

        const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleMotionChange = (e) => setCapabilities(p => ({ ...p, reducedMotion: e.matches }));

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (darkThemeMq.addEventListener) {
            darkThemeMq.addEventListener('change', handleThemeChange);
            motionMq.addEventListener('change', handleMotionChange);
        } else {
            // Safari legacy support just in case
            darkThemeMq.addListener(handleThemeChange);
            motionMq.addListener(handleMotionChange);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (darkThemeMq.removeEventListener) {
                darkThemeMq.removeEventListener('change', handleThemeChange);
                motionMq.removeEventListener('change', handleMotionChange);
            } else {
                darkThemeMq.removeListener(handleThemeChange);
                motionMq.removeListener(handleMotionChange);
            }
        };
    }, []);

    return (
        <HardwareCapabilitiesContext.Provider value={capabilities}>
            {children}
        </HardwareCapabilitiesContext.Provider>
    );
}

export const useHardwareCapabilities = () => useContext(HardwareCapabilitiesContext);
