import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';

export function PrivacyView() {
    return (
        <section className="view is-active" id="view-privacy" aria-label="Privacy" style={{ display: 'block' }}>
            <div className="view-header">
                <Link to="/home" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <Typography variant="h2" as="h2">Privacy</Typography>
            </div>

            <div className="about-layout">
                <div className="about-card glass">
                    <h3>Local-First Data</h3>
                    <p>Practice history, recordings, curriculum progress, and recommendations are stored on this device.</p>
                </div>

                <div className="about-card glass">
                    <h3>What Is Stored</h3>
                    <p>Song and game attempts, mission progress, parent goals, adaptive model signals, and optional recordings.</p>
                </div>

                <div className="about-card glass">
                    <h3>Controls</h3>
                    <p>Parents can export backups, clear recordings, reset adaptive learning, and delete all local data from Parent Zone.</p>
                </div>

                <div className="about-card glass">
                    <h3>Retention</h3>
                    <p>Data is kept until a parent removes it or the app storage is cleared by the device.</p>
                </div>
            </div>

            <div className="home-utility-links glass" aria-label="Privacy actions">
                <Link className="btn btn-secondary" to="/parent">Open Parent Zone</Link>
                <Link className="btn btn-ghost" to="/backup">Backup Tools</Link>
                <Link className="btn btn-ghost" to="/about">About</Link>
            </div>
        </section>
    );
}
