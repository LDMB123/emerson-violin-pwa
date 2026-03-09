import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';

export function HelpView() {
    return (
        <section className="view is-active" id="view-help" aria-label="Help" style={{ display: 'block' }}>
            <div className="view-header">
                <Link to="/home" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <Typography variant="h2" as="h2">Help</Typography>
            </div>

            <div className="help-layout">
                <details className="help-card glass">
                    <summary>How do I install the app?</summary>
                    <p>On iPad Safari, tap Share then Add to Home Screen. In supported desktop/mobile browsers, use the in-app Install prompt.</p>
                </details>
                <details className="help-card glass">
                    <summary>Why does the tuner not hear me?</summary>
                    <p>Allow microphone access in Safari settings, then open Tuner again.</p>
                </details>
                <details className="help-card glass">
                    <summary>Can we practice offline?</summary>
                    <p>Yes. Install once, then songs and games work without internet.</p>
                </details>
                <details className="help-card glass">
                    <summary>Where are advanced controls?</summary>
                    <p>Open Parent Zone for updates, offline repair, and diagnostics.</p>
                </details>
            </div>
        </section>
    );
}
