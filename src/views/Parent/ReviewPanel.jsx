import React, { useState, useEffect } from 'react';
import { useProgressSummary } from '../../hooks/useProgressSummary.js';
import { getLearningRecommendations } from '../../ml/recommendations.js';
import { readJsonAsync } from '../../utils/storage-utils.js';

// A simple utility to map data points to an SVG radar chart polygon
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SKILL_COLORS = ['#FF3B30', '#FF9500', '#34C759', '#007AFF', '#5856D6'];
const SKILL_KEYS = ['pitch', 'rhythm', 'bow_control', 'reading', 'posture'];

export function ReviewPanel() {
    const { summary, isLoading } = useProgressSummary();
    const [recs, setRecs] = useState(null);
    const [sessionHistory, setSessionHistory] = useState([]);
    const [weeklyMinutes, setWeeklyMinutes] = useState([0, 0, 0, 0, 0, 0, 0]);
    const [songProgress, setSongProgress] = useState([]);

    useEffect(() => {
        let mounted = true;
        getLearningRecommendations().then((data) => {
            if (mounted) setRecs(data);
        }).catch(err => console.error("Failed to load ML history", err));

        // Load session history
        readJsonAsync('practice-logs', []).then(logs => {
            if (mounted) {
                setSessionHistory(logs.slice().reverse().slice(0, 10));
                // Build weekly bar chart data
                const now = new Date();
                const mins = [0, 0, 0, 0, 0, 0, 0];
                logs.forEach(log => {
                    const d = new Date(log.date);
                    const diffDays = Math.floor((now - d) / 86400000);
                    if (diffDays >= 0 && diffDays < 7) {
                        mins[d.getDay()] += (log.duration || log.minutes || 5);
                    }
                });
                setWeeklyMinutes(mins);
            }
        });

        // Load song progress
        readJsonAsync('panda-violin:song-progress-v2', {}).then(data => {
            if (mounted && data) {
                const entries = Object.entries(data).map(([id, info]) => ({
                    id,
                    stars: info.bestStars || 0,
                    tier: info.bestStars >= 5 ? 'gold' : info.bestStars >= 4 ? 'silver' : info.bestStars >= 2 ? 'bronze' : 'foundation',
                    lastPlayed: info.lastPlayed
                })).filter(e => e.stars > 0);
                setSongProgress(entries);
            }
        }).catch(() => { });

        return () => { mounted = false; };
    }, []);

    const skillsData = summary?.skills || {
        bow_control: 0, pitch: 0, rhythm: 0, reading: 0, posture: 0
    };

    const skills = [
        { name: "Bow Hold", val: skillsData.bow_control || 0 },
        { name: "Intonation", val: skillsData.pitch || 0 },
        { name: "Rhythm", val: skillsData.rhythm || 0 },
        { name: "Reading", val: skillsData.reading || 0 },
        { name: "Posture", val: skillsData.posture || 0 }
    ];

    const generateRadarPolygon = (data, centerX, centerY, scale) => {
        const points = data.map((d, i) => {
            const angle = (360 / data.length) * i;
            const r = (d.val / 100) * scale;
            const pt = polarToCartesian(centerX, centerY, r, angle);
            return `${pt.x},${pt.y}`;
        });
        return points.join(' ');
    };

    const cx = 100;
    const cy = 100;
    const rScale = 80;

    const handleShare = async () => {
        const streak = summary?.streak || 0;
        const totalMins = weeklyMinutes.reduce((a, b) => a + b, 0);
        const text = `🐼 Panda Violin Weekly Summary\n🔥 ${streak}-day streak\n⏱️ ${totalMins} minutes practiced this week\n🎯 Skills: Pitch ${skillsData.pitch}%, Rhythm ${skillsData.rhythm}%, Bowing ${skillsData.bow_control}%\n🎵 ${songProgress.length} songs played`;

        if (navigator.share) {
            try {
                await navigator.share({ title: 'Panda Violin Progress', text });
            } catch (e) { /* user cancelled */ }
        } else {
            try {
                await navigator.clipboard.writeText(text);
                alert('Summary copied to clipboard!');
            } catch (_) { }
        }
    };

    const maxWeeklyMin = Math.max(...weeklyMinutes, 1);
    const TIER_COLORS = { gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32', foundation: 'var(--color-surface)' };

    return (
        <div className="parent-overview glass">
            <h3>Child Progress Overview</h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', marginBottom: 'var(--space-5)' }}>
                {/* SVG Radar Chart */}
                <div style={{ width: '200px', height: '200px', flexShrink: 0, position: 'relative' }}>
                    <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ overflow: 'visible' }}>
                        {[0.2, 0.4, 0.6, 0.8, 1.0].map((step, idx) => (
                            <polygon
                                key={idx}
                                points={generateRadarPolygon(skills.map(() => ({ val: 100 })), cx, cy, rScale * step)}
                                fill="none"
                                stroke="var(--color-surface)"
                                strokeWidth="1"
                            />
                        ))}
                        {skills.map((d, i) => {
                            const angle = (360 / skills.length) * i;
                            const pt = polarToCartesian(cx, cy, rScale, angle);
                            return <line key={`axis-${i}`} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="var(--color-surface)" strokeWidth="1" />;
                        })}
                        <polygon
                            points={generateRadarPolygon(skills, cx, cy, rScale)}
                            fill="var(--color-primary-transparent)"
                            stroke="var(--color-primary)"
                            strokeWidth="3"
                            strokeLinejoin="round"
                        />
                        {skills.map((d, i) => {
                            const angle = (360 / skills.length) * i;
                            const pt = polarToCartesian(cx, cy, (d.val / 100) * rScale, angle);
                            return <circle key={`pt-${i}`} cx={pt.x} cy={pt.y} r="4" fill="var(--color-bg)" stroke="var(--color-primary)" strokeWidth="2" />;
                        })}
                        {skills.map((d, i) => {
                            const angle = (360 / skills.length) * i;
                            const pt = polarToCartesian(cx, cy, rScale + 15, angle);
                            let anchor = 'middle';
                            if (angle > 10 && angle < 170) anchor = 'start';
                            if (angle > 190 && angle < 350) anchor = 'end';
                            return (
                                <text key={`lbl-${i}`} x={pt.x} y={pt.y + 4} textAnchor={anchor} fill="var(--color-text)" fontSize="10px" fontWeight="bold">
                                    {d.name}
                                </text>
                            );
                        })}
                    </svg>
                </div>

                <div className="overview-skills" style={{ flex: 1, minWidth: '200px' }}>
                    {skills.map((skill) => (
                        <div key={skill.name} className="overview-skill" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span className="skill-name" style={{ fontWeight: 'bold' }}>{skill.name}</span>
                            <span className="skill-value" style={{ color: 'var(--color-primary)' }}>{skill.val}%</span>
                        </div>
                    ))}

                    <div className="xp-dashboard" style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Level {summary?.experience?.level || 1}</span>
                            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{summary?.experience?.xp || 0} XP</span>
                        </div>
                        <div className="progress-bar-bg" style={{ width: '100%', height: '8px', background: 'var(--color-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div className="progress-bar-fill" style={{ width: `${summary?.experience?.progressToNext || 0}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }}></div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {summary?.experience?.xpToNext || 0} XP to Next Level
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Practice Bar Chart */}
            <div style={{ marginTop: '24px' }}>
                <h4>Practice This Week</h4>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', padding: '0 8px' }}>
                    {weeklyMinutes.map((mins, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{mins > 0 ? `${mins}m` : ''}</span>
                            <div style={{
                                width: '100%',
                                height: `${Math.max(4, (mins / maxWeeklyMin) * 100)}%`,
                                background: mins > 0 ? 'var(--color-primary)' : 'var(--color-surface)',
                                borderRadius: '6px 6px 0 0',
                                transition: 'height 0.3s ease-out',
                                minHeight: '4px'
                            }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{DAY_LABELS[i]}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Session History */}
            <div style={{ marginTop: '24px' }}>
                <h4>Recent Sessions</h4>
                {sessionHistory.length === 0 ? (
                    <p className="setting-note">No practice sessions logged yet.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {sessionHistory.map((entry, i) => (
                            <div key={entry.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{entry.checks?.filter(Boolean).length || 0}/5 checks · {entry.notes ? 'Notes ✓' : 'No notes'}</div>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>{entry.duration || entry.minutes || 5}m</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Curriculum Map */}
            <div className="parent-outcome-grid curriculum-map-grid" style={{ marginTop: '24px' }}>
                <h4>Curriculum Map</h4>
                {!recs ? (
                    <p className="setting-note">Awaiting ML Assessment data to generate maps.</p>
                ) : (
                    <div style={{ width: '100%', height: '200px', position: 'relative', marginTop: '16px', borderLeft: '1px solid var(--color-surface)', borderBottom: '1px solid var(--color-surface)' }}>
                        <svg viewBox="0 0 400 200" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                            {[0, 25, 50, 75, 100].map((val) => {
                                const y = 200 - (val / 100) * 200;
                                return (
                                    <g key={`gy-${val}`}>
                                        <line x1="0" y1={y} x2="400" y2={y} stroke="var(--color-surface)" strokeWidth="1" strokeDasharray="4 4" />
                                        <text x="-5" y={y + 3} textAnchor="end" fill="var(--color-text-muted)" fontSize="10px">{val}</text>
                                    </g>
                                );
                            })}
                            {recs.skillScores?.history?.length > 0 && SKILL_KEYS.map((skillKey, idx) => {
                                const history = recs.skillScores.history;
                                const pts = history.map((snap, i) => {
                                    const x = (i / Math.max(1, history.length - 1)) * 400;
                                    const y = 200 - ((snap.scores[skillKey] || 0) / 100) * 200;
                                    return `${x},${y}`;
                                }).join(' L ');
                                return (
                                    <path key={skillKey} d={`M ${pts}`} fill="none" stroke={SKILL_COLORS[idx]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                );
                            })}
                        </svg>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '16px' }}>
                            {SKILL_KEYS.map((k, i) => (
                                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SKILL_COLORS[i] }} />
                                    {k.replace('_', ' ')}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Song Mastery Heatmap */}
            <div className="parent-outcome-grid song-heatmap-grid" style={{ marginTop: '24px' }}>
                <h4>Song Mastery Heatmap</h4>
                {songProgress.length === 0 ? (
                    <p className="setting-note">Play songs to populate this heatmap.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', marginTop: '12px' }}>
                        {songProgress.map(song => (
                            <div key={song.id} style={{
                                padding: '8px',
                                borderRadius: '8px',
                                background: TIER_COLORS[song.tier],
                                border: `2px solid ${song.tier === 'gold' ? '#DAA520' : 'rgba(0,0,0,0.08)'}`,
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: song.tier === 'foundation' ? 'var(--color-text-muted)' : '#333'
                            }}>
                                <div>{'⭐'.repeat(Math.min(song.stars, 5))}</div>
                                <div style={{ marginTop: '2px', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {song.id.replace(/_/g, ' ')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <h4 style={{ marginTop: '32px' }}>Recommended next actions</h4>
            <ol className="next-actions-list" style={{ paddingLeft: '20px', color: 'var(--color-text-muted)' }}>
                <li>Complete one mission step to receive actionable guidance.</li>
            </ol>

            <div className="parent-actions" style={{ marginTop: '32px' }}>
                <button className="btn btn-primary" type="button" onClick={handleShare}>Share Weekly Summary</button>
            </div>
            <p className="parent-share-note" style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                Share this week's summary via AirDrop, Messages, or Files.
            </p>
        </div>
    );
}

