import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';
import { useUserPreferences } from '../../context/UserPreferencesContext.jsx';

export function ChildSettingsView() {
    const {
        preferences,
        toggleSound,
        setTextSize,
        setReducedMotion,
        setTheme
    } = useUserPreferences();

    return (
        <section className="view is-active" id="view-settings" aria-label="Settings" style={{ display: 'block' }}>
            <div className="view-header">
                <Link to="/home" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <Typography variant="h2" as="h2">Settings</Typography>
            </div>

            <div className="settings-layout" style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--space-4)' }}>
                <div className="settings-card glass" style={{ marginBottom: 'var(--space-4)' }}>
                    <h3>Child Settings</h3>

                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                        <span>Text Size</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['small', 'normal', 'large'].map(size => {
                                const labels = { small: 'Small', normal: 'Medium', large: 'Large' };
                                const isActive = (preferences.textSize || 'normal') === size;
                                return (
                                    <button
                                        key={size}
                                        onClick={() => setTextSize(size)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '12px',
                                            fontWeight: 'bold',
                                            fontSize: size === 'small' ? '0.85rem' : size === 'large' ? '1.15rem' : '1rem',
                                            border: `2px solid ${isActive ? 'var(--color-primary)' : 'rgba(0,0,0,0.1)'}`,
                                            background: isActive ? 'var(--color-primary)' : 'transparent',
                                            color: isActive ? '#fff' : 'var(--color-text)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        aria-pressed={isActive}
                                    >
                                        {labels[size]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <p className="setting-note">Adjusts text size across the app.</p>

                    <label className="setting-row">
                        <span>Sound</span>
                        <span className="toggle">
                            <input
                                type="checkbox"
                                checked={preferences.soundsEnabled}
                                onChange={toggleSound}
                            />
                            <span className="toggle-slider"></span>
                        </span>
                    </label>
                    <p className="setting-note">App sound effects and background music.</p>

                    <label className="setting-row">
                        <span>Less motion</span>
                        <span className="toggle">
                            <input
                                type="checkbox"
                                checked={preferences.reducedMotion}
                                onChange={(e) => setReducedMotion(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </span>
                    </label>
                    <p className="setting-note">Disables certain animations and transitions.</p>

                    <label className="setting-row">
                        <span>Panda Voice Coach</span>
                        <span className="toggle">
                            <input
                                type="checkbox"
                                checked={preferences.voiceCoach !== false}
                                onChange={(e) => {
                                    const enabled = e.target.checked;
                                    // Update context
                                    if (typeof preferences.setVoiceCoach === 'function') {
                                        preferences.setVoiceCoach(enabled);
                                    }
                                    // Update the legacy DOM dataset flag
                                    document.documentElement.dataset.voiceCoach = enabled ? 'on' : 'off';
                                    // Persist to localStorage directly
                                    try {
                                        const prefs = JSON.parse(localStorage.getItem('panda-violin:user-preferences') || '{}');
                                        prefs.voiceCoach = enabled;
                                        localStorage.setItem('panda-violin:user-preferences', JSON.stringify(prefs));
                                    } catch (_) { }
                                }}
                            />
                            <span className="toggle-slider"></span>
                        </span>
                    </label>
                    <p className="setting-note">Panda speaks encouraging tips during practice.</p>

                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                        <span>App Theme</span>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {['cream', 'blue', 'green', 'dark'].map((t) => {
                                const isSelected = (preferences.theme || 'cream') === t;
                                const bgColors = {
                                    'cream': '#FFF9F3',
                                    'blue': '#E8F0F8',
                                    'green': '#EAF4EC',
                                    'dark': '#1A1A2E'
                                };
                                const textColors = {
                                    'cream': '#352019',
                                    'blue': '#1a2b3c',
                                    'green': '#193020',
                                    'dark': '#F5F5F5'
                                };
                                const names = {
                                    'cream': 'Cream',
                                    'blue': 'Calm Blue',
                                    'green': 'Soft Green',
                                    'dark': 'Night'
                                };
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setTheme(t)}
                                        style={{
                                            width: '70px',
                                            height: '70px',
                                            borderRadius: 'var(--radius-md)',
                                            background: bgColors[t],
                                            color: textColors[t],
                                            border: `3px solid ${isSelected ? 'var(--color-primary)' : 'rgba(0,0,0,0.1)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem',
                                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                            boxShadow: isSelected ? '0 4px 12px rgba(233, 86, 57, 0.3)' : 'none',
                                            transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s'
                                        }}
                                        aria-label={`Select ${names[t]} theme`}
                                        aria-pressed={isSelected}
                                    >
                                        {names[t]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <p className="setting-note">Switches the background color mode.</p>
                </div>

                <div className="settings-card glass" style={{ marginBottom: 'var(--space-4)' }}>
                    <h3>For Grown-Ups</h3>
                    <p className="setting-note">Advanced app controls and progress data are in the Parent Zone.</p>
                    <div style={{ marginTop: '16px' }}>
                        <Link className="btn btn-secondary" to="/parent">Open Parent Zone</Link>
                    </div>
                </div>

                <div className="settings-card glass" style={{ marginBottom: 'var(--space-4)' }}>
                    <h3>Support</h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                        <Link className="btn btn-ghost" to="/support/help" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Help / FAQ</Link>
                        <Link className="btn btn-ghost" to="/support/about" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>About App</Link>
                        <Link className="btn btn-ghost" to="/support/privacy" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Privacy</Link>
                    </div>
                </div>

                <div className="settings-card glass">
                    <h3>Version</h3>
                    <p className="setting-note">Panda Violin 2.0.0 (React Spike)</p>
                </div>
            </div>
        </section>
    );
}
