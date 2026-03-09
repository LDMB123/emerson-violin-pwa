import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';

export function AboutView() {
    return (
        <section className="view is-active" id="view-about" aria-label="About" style={{ display: 'block' }}>
            <div className="view-header">
                <Link to="/home" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <Typography variant="h2" as="h2">About</Typography>
            </div>

            <div className="about-layout">
                <div className="about-card glass">
                    <h3>Panda Violin</h3>
                    <p>A local-first practice app built for Emerson.</p>
                </div>
                <div className="about-card glass">
                    <h3>Built for iPad</h3>
                    <p>Large buttons, readable text, and offline use by default.</p>
                </div>
                <div className="about-card glass">
                    <h3>Privacy</h3>
                    <p>Practice data stays on this device unless a parent exports it.</p>
                    <Link className="btn btn-ghost" to="/privacy">Read privacy details</Link>
                </div>
            </div>
        </section>
    );
}
