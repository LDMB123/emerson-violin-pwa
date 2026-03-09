import React, { useState, useEffect } from 'react';
import { readJsonAsync } from '../../utils/storage-utils.js';

export function GoalsPanel() {
    const [goal, setGoal] = useState({
        title: 'Minuet 1',
        dailyMinutes: 15,
        practiceDays: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
        recitalDate: ''
    });
    const [saved, setSaved] = useState(false);
    const [weekProgress, setWeekProgress] = useState({ days: 0, targetDays: 5, minutes: 0, targetMinutes: 75 });

    useEffect(() => {
        const stored = localStorage.getItem('parent-goals');
        if (stored) {
            try {
                setGoal(prev => ({ ...prev, ...JSON.parse(stored) }));
            } catch (e) { }
        }

        // Calculate real weekly progress from practice logs
        readJsonAsync('practice-logs', []).then(logs => {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const weekLogs = logs.filter(l => new Date(l.date) >= weekAgo);
            const uniqueDays = new Set(weekLogs.map(l => new Date(l.date).toDateString())).size;
            const totalMinutes = weekLogs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0);
            // Use the already-parsed goal state rather than re-reading localStorage
            setWeekProgress(prev => {
                const parsedGoal = { dailyMinutes: prev.targetMinutes / Math.max(1, prev.targetDays) };
                const storedRaw = localStorage.getItem('parent-goals');
                const storedGoal = storedRaw ? JSON.parse(storedRaw) : {};
                const targetDays = storedGoal.practiceDays ? Object.values(storedGoal.practiceDays).filter(Boolean).length : 5;
                const targetMinutes = targetDays * (storedGoal.dailyMinutes || 15);
                return { days: uniqueDays, targetDays, minutes: totalMinutes, targetMinutes };
            });
        }).catch(() => { });
    }, []);

    const handleSave = () => {
        localStorage.setItem('parent-goals', JSON.stringify(goal));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    // Recital countdown
    const recitalDaysAway = goal.recitalDate
        ? Math.max(0, Math.ceil((new Date(goal.recitalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null;

    const weekPercent = weekProgress.targetMinutes > 0
        ? Math.min(100, Math.round((weekProgress.minutes / weekProgress.targetMinutes) * 100))
        : 0;

    return (
        <div className="parent-goals glass">
            <h3>Goal Setting</h3>

            {/* Daily Practice Goal Slider (spec 2352) */}
            <div className="setting-row" style={{ display: 'block' }}>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Daily Practice Goal</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                        type="range"
                        min="5" max="30" step="1"
                        value={goal.dailyMinutes}
                        onChange={e => setGoal({ ...goal, dailyMinutes: parseInt(e.target.value, 10) })}
                        style={{ flex: 1, accentColor: 'var(--color-primary)' }}
                        data-parent-goal-minutes-input
                        data-parent-goal-bound="true"
                    />
                    <span style={{ fontWeight: 700, fontSize: '1.2rem', minWidth: '60px', textAlign: 'right' }}>{goal.dailyMinutes} min</span>
                </div>
            </div>

            {/* Practice Days (spec 2355) */}
            <div className="setting-row" style={{ display: 'block', marginTop: '16px' }}>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Practice Days</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {Object.keys(goal.practiceDays).map(day => (
                        <button
                            key={day}
                            type="button"
                            onClick={() => setGoal({
                                ...goal,
                                practiceDays: { ...goal.practiceDays, [day]: !goal.practiceDays[day] }
                            })}
                            style={{
                                width: '44px', height: '44px', borderRadius: '50%', border: '2px solid',
                                borderColor: goal.practiceDays[day] ? 'var(--color-primary)' : 'var(--color-border)',
                                background: goal.practiceDays[day] ? 'var(--color-primary)' : 'transparent',
                                color: goal.practiceDays[day] ? '#fff' : 'var(--color-text)',
                                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer'
                            }}
                        >
                            {day.charAt(0)}{goal.practiceDays[day] ? '✓' : ''}
                        </button>
                    ))}
                </div>
            </div>

            {/* This Week Progress (spec 2357-2358) */}
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>This Week</span>
                <div className="goal-progress parent-goal-progress" role="progressbar" aria-label="Weekly goal progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={weekPercent} style={{ height: '12px', background: 'rgba(0,0,0,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div className="goal-fill" style={{ width: `${weekPercent}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '6px', transition: 'width 0.4s ease' }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    <span>{weekProgress.days}/{weekProgress.targetDays} days</span>
                    <span>{weekProgress.minutes}/{weekProgress.targetMinutes}m</span>
                </div>
            </div>

            {/* Recital Countdown (spec 2360-2362) */}
            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Recital Countdown</span>
                {recitalDaysAway !== null ? (
                    <div style={{ fontSize: '1.1rem' }}>
                        🎻 <strong>{goal.title}</strong> — <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{recitalDaysAway} days away</span>
                    </div>
                ) : (
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Set a recital date to see the countdown.</p>
                )}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                    <label style={{ flex: 1 }}>
                        <input
                            type="date"
                            value={goal.recitalDate || ''}
                            onChange={e => setGoal({ ...goal, recitalDate: e.target.value })}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '1rem' }}
                        />
                    </label>
                </div>
            </div>

            {/* Recital Piece */}
            <div style={{ marginTop: '16px' }}>
                <label className="setting-row">
                    <span>Recital piece</span>
                    <input
                        className="parent-goal-input"
                        type="text"
                        value={goal.title}
                        onChange={e => setGoal({ ...goal, title: e.target.value })}
                        placeholder="Next recital piece"
                        autoComplete="off"
                        data-parent-goal-title-input
                        data-parent-goal-bound="true"
                    />
                </label>
            </div>

            <div className="parent-actions" style={{ marginTop: '24px' }}>
                <button className="btn btn-secondary" type="button" onClick={handleSave} data-parent-goal-save data-parent-goal-bound="true">Save Goals</button>
            </div>
            {saved && <p className="parent-settings-note" data-parent-goal-status style={{ color: 'var(--color-success)' }}>Goals saved successfully.</p>}
            {!saved && <span data-parent-goal-status style={{ display: 'none' }}></span>}
        </div>
    );
}
