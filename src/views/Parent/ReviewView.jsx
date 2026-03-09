import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';
import { useProgressSummary } from '../../hooks/useProgressSummary.js';

function getRadarPoint(value, index) {
    const angle = (Math.PI * 2 * index / 5) - Math.PI / 2;
    const r = (value / 100) * 80;
    const x = 100 + r * Math.cos(angle);
    const y = 100 + r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
}

export function ReviewView() {
    const { summary, isLoading } = useProgressSummary();

    if (isLoading || !summary) return null; // Hydrating

    const skills = summary.skills || {};
    const pitchVal = skills.pitch || 0;
    const rhythmVal = skills.rhythm || 0;
    const readingVal = skills.reading || 0;
    const bowingVal = skills.bowing || skills.bow_control || 0;
    const postureVal = skills.posture || 0;

    const dataPoints = [
        getRadarPoint(pitchVal, 0),
        getRadarPoint(rhythmVal, 1),
        getRadarPoint(readingVal, 2),
        getRadarPoint(bowingVal, 3),
        getRadarPoint(postureVal, 4)
    ].join(' ');

    const zeroPoints = [
        getRadarPoint(0, 0),
        getRadarPoint(0, 1),
        getRadarPoint(0, 2),
        getRadarPoint(0, 3),
        getRadarPoint(0, 4)
    ].join(' ');

    // 33%, 66%, 100% rings
    const ring33 = Array.from({ length: 5 }).map((_, i) => getRadarPoint(33.3, i)).join(' ');
    const ring66 = Array.from({ length: 5 }).map((_, i) => getRadarPoint(66.6, i)).join(' ');
    const ring100 = Array.from({ length: 5 }).map((_, i) => getRadarPoint(100, i)).join(' ');

    return (
        <section className="view is-active" id="view-analysis" aria-label="Session Review" style={{ display: 'block' }}>
            <div className="view-header">
                <Link to="/wins" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <Typography variant="h2" as="h2">Session Review</Typography>
            </div>

            <div className="analysis-layout">
                {/* Practice Line Chart */}
                <div className="analysis-chart glass">
                    <h3>Your Practice Line</h3>
                    <svg className="analysis-chart-svg" viewBox="0 0 320 180" aria-hidden="true">
                        <path className="analysis-chart-line" d="M20 140 L80 110 L140 120 L200 90 L260 80 L300 60"></path>
                        <g className="analysis-chart-points">
                            <circle cx="20" cy="140" r="6"></circle>
                            <circle cx="80" cy="110" r="6"></circle>
                            <circle cx="140" cy="120" r="6"></circle>
                            <circle cx="200" cy="90" r="6"></circle>
                            <circle cx="260" cy="80" r="6"></circle>
                            <circle cx="300" cy="60" r="6"></circle>
                        </g>
                    </svg>
                    <div className="analysis-chart-caption">Nice work today!</div>
                </div>

                {/* Radar Skill Chart */}
                <div className="progress-details glass">
                    <h3>Skill Map</h3>
                    <div className="skill-radar">
                        <div className="radar-chart">
                            <svg className="radar-svg" viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">
                                <g className="radar-grid">
                                    <polygon points={ring33} fill="none" stroke="var(--color-text-muted)" opacity="0.2"></polygon>
                                    <polygon points={ring66} fill="none" stroke="var(--color-text-muted)" opacity="0.2"></polygon>
                                    <polygon points={ring100} fill="none" stroke="var(--color-text-muted)" opacity="0.2"></polygon>
                                </g>
                                <polygon className="radar-data"
                                    points={dataPoints}
                                    fill="var(--color-primary)" fillOpacity="0.15"
                                    stroke="var(--color-primary)" strokeWidth="2">
                                    <animate attributeName="points"
                                        from={zeroPoints}
                                        to={dataPoints}
                                        dur="0.6s" fill="freeze"
                                        calcMode="spline" keySplines="0.4 0 0.6 1" />
                                </polygon>
                                <g className="radar-points">
                                    {dataPoints.split(' ').map((pt, i) => {
                                        const [cx, cy] = pt.split(',');
                                        const colors = ['var(--color-skill-pitch)', 'var(--color-skill-rhythm)', 'var(--color-skill-reading)', 'var(--color-skill-bowing)', 'var(--color-skill-posture)'];
                                        return <circle key={i} className="radar-point" cx={cx} cy={cy} r="4" fill={colors[i]}></circle>;
                                    })}
                                </g>
                                <text x="100" y="10" className="radar-label" textAnchor="middle" fill="var(--color-skill-pitch)">Pitch</text>
                                <text x="185" y="70" className="radar-label" textAnchor="middle" fill="var(--color-skill-rhythm)">Rhythm</text>
                                <text x="160" y="190" className="radar-label" textAnchor="middle" fill="var(--color-skill-reading)">Reading</text>
                                <text x="40" y="190" className="radar-label" textAnchor="middle" fill="var(--color-skill-bowing)">Bowing</text>
                                <text x="15" y="70" className="radar-label" textAnchor="middle" fill="var(--color-skill-posture)">Posture</text>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* General Stats */}
                <div className="analysis-stats">
                    <div className="analysis-stat glass">
                        <div className="analysis-stat-label">Minutes played</div>
                        <div className="analysis-stat-value">{summary.totalMinutes || 0} min</div>
                    </div>
                    <div className="analysis-stat glass">
                        <div className="analysis-stat-label">Accuracy</div>
                        <div className="analysis-stat-value">{(summary.skills?.pitch || 0).toFixed(0)}%</div>
                    </div>
                </div>

                {/* Legacy Data Grids from Progress.html */}
                <div className="progress-outcomes mt-4">
                    <section className="progress-outcome-card">
                        <h3>Curriculum Map</h3>
                        <div className="outcome-grid curriculum-map-grid">
                            <p>Curriculum progress appears after your first mission.</p>
                        </div>
                    </section>

                    <section className="progress-outcome-card">
                        <h3>Song Mastery Heatmap</h3>
                        <div className="outcome-grid song-heatmap-grid">
                            <p>No song mastery data yet.</p>
                        </div>
                    </section>

                    <section className="progress-outcome-card">
                        <h3>Game Mastery Matrix</h3>
                        <div className="outcome-grid game-mastery-grid">
                            <p>No game mastery data yet.</p>
                        </div>
                    </section>
                </div>
            </div>
        </section>
    );
}
