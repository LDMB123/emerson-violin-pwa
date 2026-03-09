import React from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';

export function BackupView() {
    return (
        <section className="view is-active" id="view-backup" aria-label="Backup" style={{ display: 'block' }}>
            <div className="view-header">
                <Link to="/home" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <Typography variant="h2" as="h2">Backup</Typography>
            </div>

            <div className="backup-layout">
                <div className="backup-card glass">
                    <h3>Parent Summary Export</h3>
                    <p>Open Parent Zone to share or save a weekly summary.</p>
                    <Link className="btn btn-primary" to="/parent">Open Parent Zone</Link>
                </div>

                <div className="backup-card glass">
                    <h3>Local Data Backup</h3>
                    <p>Export a JSON backup or import one on this device.</p>

                    <button className="btn btn-secondary" type="button" data-export-json>Export Backup</button>
                    <p className="setting-note" data-export-status aria-live="polite">Backup not created yet.</p>

                    <button className="btn btn-secondary" type="button" data-import-json>Import Backup</button>
                    <input type="file" accept="application/json" data-import-file hidden aria-label="Import backup file" />
                    <p className="setting-note" data-import-status aria-live="polite">No backup imported yet.</p>
                </div>
            </div>
        </section>
    );
}
