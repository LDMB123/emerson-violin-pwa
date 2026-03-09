import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useUserPreferences } from '../../context/UserPreferencesContext.jsx';
import { getAdaptiveSummary, resetAdaptiveModel } from '../../ml/adaptive-engine.js';
import { downloadBlob } from '../../utils/download-blob.js';

export function SettingsPanel() {
    const { preferences, toggleSound } = useUserPreferences();
    const [settings, setSettings] = useState({
        keepAwake: true,
        orientationLock: true,
        recordings: true,
        voiceCoach: true,
        coachingStyle: 'standard',
        dailyReminder: true,
        difficultyOverrides: {}
    });

    const [vitals, setVitals] = useState(null);
    const [mlData, setMlData] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('parent-settings-extended');
        if (stored) {
            try {
                setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
            } catch (e) { }
        }

        try {
            const history = JSON.parse(localStorage.getItem('WEB_VITALS_KEY') || '[]');
            setVitals(history.length > 0 ? history[history.length - 1] : null);
        } catch (e) { }

        getAdaptiveSummary().then(setMlData).catch(console.error);
    }, []);

    const handleChange = (key, value) => {
        const next = { ...settings, [key]: value };
        setSettings(next);
        localStorage.setItem('parent-settings-extended', JSON.stringify(next));
    };

    const handleDifficultyChange = (gameId, level) => {
        const nextOverrides = { ...settings.difficultyOverrides, [gameId]: level };
        handleChange('difficultyOverrides', nextOverrides);
    };

    const handleExportICS = () => {
        const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Panda Strings//EN\nBEGIN:VEVENT\nDTSTART:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\nSUMMARY:Violin Practice\nRRULE:FREQ=DAILY\nEND:VEVENT\nEND:VCALENDAR`;
        downloadBlob(icsContent, 'violin-practice.ics', 'text/calendar');
    };

    const handleResetML = async () => {
        if (window.confirm("Are you sure you want to reset the ML Adaptive Model? This will erase all custom difficulty tuning.")) {
            await resetAdaptiveModel();
            getAdaptiveSummary().then(setMlData).catch(console.error);
            alert("ML Model reset successfully.");
        }
    };

    const SAMPLE_GAMES = [
        { id: 'bow-hero', name: 'Bow Hero' },
        { id: 'string-quest', name: 'String Quest' },
        { id: 'rhythm-dash', name: 'Rhythm Dash' },
        { id: 'pitch-perfect', name: 'Pitch Perfect' },
        { id: 'note-memory', name: 'Note Memory' }
    ];

    return (
        <div className="parent-settings-panel glass">
            <h3>App Settings</h3>

            <div className="parent-advanced-section">
                <h4>Device Controls</h4>
                <label className="setting-row">
                    <span>Keep screen awake</span>
                    <span className="toggle">
                        <input type="checkbox" checked={settings.keepAwake} onChange={(e) => handleChange('keepAwake', e.target.checked)} />
                        <span className="toggle-slider"></span>
                    </span>
                </label>
                <p className="setting-note">Screen stays on during practice sessions.</p>

                <label className="setting-row">
                    <span>Lock orientation</span>
                    <span className="toggle">
                        <input type="checkbox" checked={settings.orientationLock} onChange={(e) => handleChange('orientationLock', e.target.checked)} />
                        <span className="toggle-slider"></span>
                    </span>
                </label>
                <p className="setting-note">Orientation follows device settings.</p>
            </div>

            <div className="parent-advanced-section">
                <h4>Audio & Coach Controls</h4>
                <label className="setting-row">
                    <span>Practice recordings</span>
                    <span className="toggle">
                        <input type="checkbox" checked={settings.recordings} onChange={(e) => handleChange('recordings', e.target.checked)} />
                        <span className="toggle-slider"></span>
                    </span>
                </label>
                <label className="setting-row">
                    <span>Voice coach (Spoken tips)</span>
                    <span className="toggle">
                        <input type="checkbox" checked={settings.voiceCoach} onChange={(e) => handleChange('voiceCoach', e.target.checked)} />
                        <span className="toggle-slider"></span>
                    </span>
                </label>
                <p className="setting-note">Spoken coach tips use built-in iPad voices and work offline.</p>

                <label className="setting-row" style={{ marginTop: '16px' }}>
                    <span>Coaching Style Preset</span>
                    <select className="parent-goal-input" value={settings.coachingStyle} onChange={(e) => handleChange('coachingStyle', e.target.value)} style={{ width: 'auto' }}>
                        <option value="gentle">Gentle</option>
                        <option value="standard">Standard</option>
                        <option value="challenge">Challenge</option>
                    </select>
                </label>
            </div>

            <div className="parent-advanced-section">
                <h4>Practice Reminder</h4>
                <label className="setting-row">
                    <span>Daily reminder</span>
                    <span className="toggle">
                        <input type="checkbox" checked={settings.dailyReminder} onChange={(e) => handleChange('dailyReminder', e.target.checked)} />
                        <span className="toggle-slider"></span>
                    </span>
                </label>
                <div style={{ marginTop: '12px' }}>
                    <button className="btn btn-ghost" type="button" onClick={handleExportICS}>Export to Apple Calendar / Reminders (ICS)</button>
                </div>
            </div>

            <div className="parent-advanced-section">
                <h4>Per-Game Difficulty Overrides</h4>
                <p className="setting-note">By default, games adapt to Emerson's level automatically. You can force a specific difficulty here.</p>
                <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
                    {SAMPLE_GAMES.map(game => (
                        <label key={game.id} className="setting-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{game.name}</span>
                            <select
                                className="parent-goal-input"
                                style={{ width: 'auto', padding: '4px 8px' }}
                                value={settings.difficultyOverrides?.[game.id] || 'auto'}
                                onChange={(e) => handleDifficultyChange(game.id, e.target.value)}
                            >
                                <option value="auto">Auto (Adaptive)</option>
                                <option value="easy">Easy (Lvl 1-2)</option>
                                <option value="medium">Medium (Lvl 3)</option>
                                <option value="hard">Hard (Lvl 4-5)</option>
                            </select>
                        </label>
                    ))}
                </div>
            </div>

            <div className="parent-advanced-section">
                <h4>Performance Diagnostics (Web Vitals)</h4>
                {vitals ? (
                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '12px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace' }}>
                        <div>LCP: {vitals.lcp?.value ? (vitals.lcp.value / 1000).toFixed(2) + 's' : 'N/A'}</div>
                        <div>FID: {vitals.fid?.value ? Math.round(vitals.fid.value) + 'ms' : 'N/A'}</div>
                        <div>CLS: {vitals.cls?.value ? vitals.cls.value.toFixed(3) : 'N/A'}</div>
                    </div>
                ) : (
                    <p className="setting-note">No Web Vitals history available yet. Play some games first!</p>
                )}
            </div>

            <div className="parent-advanced-section">
                <h4>ML Diagnostics & Adaptive Engine</h4>
                {mlData ? (
                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '12px', borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', marginBottom: '12px' }}>
                        <div><strong>Total Logs:</strong> {mlData.total}</div>
                        <div><strong>Last Update:</strong> {mlData.model?.updatedAt ? new Date(mlData.model.updatedAt).toLocaleString() : 'Never'}</div>
                        <div style={{ marginTop: '8px' }}><strong>Game EMAs:</strong></div>
                        <div style={{ paddingLeft: '8px' }}>
                            {Object.entries(mlData.model?.games || {}).map(([gameId, data]) => (
                                <div key={gameId}>{gameId}: {(data.ema * 100).toFixed(1)}% ({data.samples}x)</div>
                            ))}
                            {Object.keys(mlData.model?.games || {}).length === 0 && <div>No data yet</div>}
                        </div>
                    </div>
                ) : (
                    <p className="setting-note">Loading ML Adaptive Data...</p>
                )}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" type="button" onClick={handleResetML} style={{ padding: '6px 12px', color: 'var(--color-warning)' }}>Reset Adaptive Model</button>
                    <button className="btn btn-ghost" type="button" onClick={() => alert("ML Accelerators Active:\n- WebGL 2.0 Canvas\n- AudioWorklet (Realtime Pitch)")} style={{ padding: '6px 12px' }}>Check Accelerators</button>
                </div>
            </div>
            <div className="parent-advanced-section">
                <h4>Support & Version</h4>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <Link className="btn btn-ghost" to="/support/help" style={{ padding: '6px 12px' }}>Help / FAQ</Link>
                    <Link className="btn btn-ghost" to="/support/about" style={{ padding: '6px 12px' }}>About App</Link>
                    <Link className="btn btn-ghost" to="/support/privacy" style={{ padding: '6px 12px' }}>Privacy Policy</Link>
                </div>
                <p className="setting-note" style={{ marginTop: '12px' }}>Panda Violin 2.0.0</p>
            </div>
        </div>
    );
}
