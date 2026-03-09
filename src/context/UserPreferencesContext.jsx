import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useStorage.js';

const UserPreferencesContext = createContext({});

export function UserPreferencesProvider({ children }) {
    const [preferences, setPreferences] = useLocalStorage('userPreferences', {
        soundsEnabled: true,
        theme: 'cream',
        parentModeUnlocked: false,
        textSize: 'normal',
        reducedMotion: false
    });

    // Sync preferences to document.documentElement for global CSS overrides
    useEffect(() => {
        try {
            // Apply DOM classes/attributes
            const safeTheme = preferences.theme === 'default' ? 'cream' : (preferences.theme || 'cream');
            document.documentElement.setAttribute('data-theme', safeTheme);
            document.documentElement.setAttribute('data-text-size', preferences.textSize || 'normal');
            if (preferences.reducedMotion) {
                document.documentElement.setAttribute('data-reduced-motion', 'true');
            } else {
                document.documentElement.removeAttribute('data-reduced-motion');
            }
        } catch (e) {
            console.warn('Could not apply user preferences to DOM', e);
        }
    }, [preferences]);

    const toggleSound = () => setPreferences(p => ({ ...p, soundsEnabled: !p.soundsEnabled }));
    const unlockParentMode = () => setPreferences(p => ({ ...p, parentModeUnlocked: true }));
    const lockParentMode = () => setPreferences(p => ({ ...p, parentModeUnlocked: false }));
    const setTheme = (theme) => setPreferences(p => ({ ...p, theme }));
    const setTextSize = (textSize) => setPreferences(p => ({ ...p, textSize }));
    const setReducedMotion = (reducedMotion) => setPreferences(p => ({ ...p, reducedMotion }));

    const value = {
        preferences,
        toggleSound,
        unlockParentMode,
        lockParentMode,
        setTheme,
        setTextSize,
        setReducedMotion
    };

    return (
        <UserPreferencesContext.Provider value={value}>
            {children}
        </UserPreferencesContext.Provider>
    );
}

export const useUserPreferences = () => useContext(UserPreferencesContext);
