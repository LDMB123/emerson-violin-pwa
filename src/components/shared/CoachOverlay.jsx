import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppEvent } from '../../hooks/useAppEvent.js';
import { RT_CUE } from '../../utils/event-names.js';
import { useUserPreferences } from '../../context/UserPreferencesContext.jsx';
import { Typography } from '../primitives/Typography.jsx';
import { getPublicAssetPath } from '../../utils/public-asset-path.js';

/**
 * CoachOverlay (PandaSpeech Portal)
 * 
 * A globally mounted React Portal that listens for RT_CUE events from
 * the Realtime Audio Pipeline (WASM) and displays an animated Panda 
 * speech bubble over whatever the current generic Canvas view is.
 */
export function CoachOverlay() {
    const [cue, setCue] = useState(null);
    const { preferences } = useUserPreferences();

    // Check if Parent Zone has explicitly disabled the Voice Coach
    const isCoachEnabled = preferences?.voiceCoach !== false;

    // Listen to the global EventBus for cues
    useAppEvent(RT_CUE, (e) => {
        if (!isCoachEnabled) return;

        const newCue = e.detail;
        if (!newCue) return;

        setCue(newCue);

        // Read coaching style from parent settings (DoD line 3184)
        let ttsRate = 1.1;
        let ttsPitch = 1.2;
        try {
            const stored = localStorage.getItem('parent-settings-extended');
            if (stored) {
                const parsed = JSON.parse(stored);
                const style = parsed.coachingStyle || 'standard';
                if (style === 'gentle') { ttsRate = 0.9; ttsPitch = 1.3; }
                else if (style === 'challenge') { ttsRate = 1.2; ttsPitch = 1.0; }
            }
        } catch (ex) { /* ignore */ }

        // Web Speech API TTS for the cue
        if (newCue.message && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Interrupt previous
            const utterance = new SpeechSynthesisUtterance(newCue.message);
            utterance.rate = ttsRate;
            utterance.pitch = ttsPitch;
            window.speechSynthesis.speak(utterance);
        }

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setCue(current => {
                // Only clear if another cue hasn't taken over
                if (current && current.id === newCue.id) return null;
                return current;
            });
        }, 4000);
    });

    // We only render when there's an active cue
    if (!cue) return null;

    const overlayRoot = document.getElementById('overlay-root');
    if (!overlayRoot) return null;

    return createPortal(
        <div
            className="coach-overlay-portal"
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 9999, // Above everything
                display: 'flex',
                alignItems: 'flex-end',
                gap: '16px',
                pointerEvents: 'none',
                animation: 'slide-up var(--duration-normal) var(--ease-spring)'
            }}
            role="status"
            aria-live="polite"
        >
            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(40px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .panda-speech-bubble {
                    background: var(--color-surface);
                    padding: var(--space-3) var(--space-4);
                    border-radius: 24px 24px 0 24px;
                    box-shadow: var(--shadow-xl);
                    border: 3px solid var(--color-primary);
                    max-width: 320px;
                    pointer-events: auto;
                    filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));
                }
                .panda-speech-bubble::after {
                    content: '';
                    position: absolute;
                    bottom: 12px;
                    right: -10px;
                    border-width: 10px 0 10px 14px;
                    border-style: solid;
                    border-color: transparent transparent transparent var(--color-primary);
                    display: block;
                    width: 0;
                }
            `}</style>

            <div className="panda-speech-bubble">
                <Typography variant="body" style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--color-text)' }}>
                    {cue.message}
                </Typography>
            </div>
            <img
                src={getPublicAssetPath('./assets/illustrations/mascot-encourage.webp')}
                alt="Panda Coach"
                width="100"
                height="100"
                style={{
                    filter: 'drop-shadow(var(--shadow-lg))',
                    transform: 'translateY(10px)'
                }}
            />
        </div>,
        overlayRoot
    );
}
