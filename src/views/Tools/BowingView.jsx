import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';

export function BowingView({ onComplete }) {
    return (
        <section className="view game-view is-active" id="view-bowing" aria-label="Bowing Trainer" style={{ display: 'block' }}>
            <div className="view-header">
                <Link to="/tools" onClick={(e) => { if (onComplete) { e.preventDefault(); onComplete(); } }} className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    {onComplete ? 'Complete' : 'Back'}
                </Link>
                <Typography variant="h2" as="h2">Bowing Coach</Typography>
            </div>

            <div className="game-drill game-drill--bow glass">
                <p className="game-drill-intro">Use these manual checkpoints to build smooth, even bow strokes.</p>

                <div className="game-checklist-group" data-total="4">
                    <div className="game-progress" data-total="4">
                        <span className="game-progress-label">Sets complete</span>
                    </div>
                    <ol className="game-checklist">
                        <li className="game-check-item">
                            <input type="checkbox" id="bow-set-1" />
                            <label htmlFor="bow-set-1">Play long open strings for 30 seconds.</label>
                        </li>
                        <li className="game-check-item">
                            <input type="checkbox" id="bow-set-2" />
                            <label htmlFor="bow-set-2">Keep bow parallel to the bridge for 20 strokes.</label>
                        </li>
                        <li className="game-check-item">
                            <input type="checkbox" id="bow-set-3" />
                            <label htmlFor="bow-set-3">Use a quiet bow hand and relaxed fingers.</label>
                        </li>
                        <li className="game-check-item">
                            <input type="checkbox" id="bow-set-4" />
                            <label htmlFor="bow-set-4">Practice smooth bow changes at the frog and tip.</label>
                        </li>
                    </ol>
                </div>

                <details className="game-tip">
                    <summary>Bow balance tips</summary>
                    <ul className="game-tip-list">
                        <li>Keep your wrist soft, not locked.</li>
                        <li>Let the bow weight do the work.</li>
                        <li>Reset your posture between sets.</li>
                    </ul>
                </details>
            </div>
        </section>
    );
}
