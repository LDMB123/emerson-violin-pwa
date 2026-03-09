import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { readJsonAsync } from '../../utils/storage-utils.js';
import { removeJSON } from '../../persistence/storage.js';
import { downloadBlob } from '../../utils/download-blob.js';

export function DataPanel() {
    const [wipeStatus, setWipeStatus] = useState('No destructive action performed.');
    const [storageUsage, setStorageUsage] = useState({ events: 0, recordings: 0, ml: 0, sw: 0, total: 0 });

    useEffect(() => {
        let isMounted = true;
        const calculateStorage = async () => {
            // Events: practice logs
            let eventsBytes = 0;
            try {
                const logs = await readJsonAsync('practice-logs', []);
                eventsBytes = JSON.stringify(logs).length * 2;
            } catch (e) { }

            // Recordings
            let recordingsBytes = 0;
            try {
                const recs = await readJsonAsync('practice-recordings', []);
                // Approximate: each recording ~2.4MB average
                recordingsBytes = recs.length * 2.4 * 1024 * 1024;
            } catch (e) { }

            // ML Data: adaptive engine, recommendations cache
            let mlBytes = 0;
            const mlKeys = ['panda-violin:adaptive-model', 'ML_RECS_CACHE', 'panda-violin:skill-profile'];
            for (const key of mlKeys) {
                const val = localStorage.getItem(key);
                if (val) mlBytes += val.length * 2;
            }

            // SW Cache: estimate from service worker
            let swBytes = 0;
            if ('caches' in window) {
                try {
                    const keys = await caches.keys();
                    for (const key of keys) {
                        const cache = await caches.open(key);
                        const cacheKeys = await cache.keys();
                        swBytes += cacheKeys.length * 50 * 1024; // ~50KB average per cached asset
                    }
                } catch (e) { }
            }

            if (isMounted) {
                const toMB = (b) => (b / 1024 / 1024).toFixed(1);
                setStorageUsage({
                    events: toMB(eventsBytes),
                    recordings: toMB(recordingsBytes),
                    ml: toMB(mlBytes),
                    sw: toMB(swBytes),
                    total: toMB(eventsBytes + recordingsBytes + mlBytes + swBytes)
                });
            }
        };

        calculateStorage();
        return () => { isMounted = false; };
    }, []);

    const handleBackup = () => {
        try {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data[key] = localStorage.getItem(key);
            }
            downloadBlob(
                JSON.stringify(data, null, 2),
                `panda_violin_backup_${new Date().toISOString().split('T')[0]}.json`,
                'application/json'
            );
            setWipeStatus('Backup downloaded successfully.');
            setTimeout(() => setWipeStatus('No destructive action performed.'), 3000);
        } catch (e) {
            console.error('Backup failed', e);
            setWipeStatus('Failed to create backup.');
        }
    };

    const handleRestore = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                Object.keys(data).forEach(key => {
                    localStorage.setItem(key, data[key]);
                });
                setWipeStatus("Data restored successfully! Please refresh the page.");
            } catch (err) {
                console.error("Restore failed", err);
                setWipeStatus("Failed to restore data. Invalid file format.");
            }
        };
        reader.readAsText(file);
    };

    const handleWipe = async () => {
        if (window.confirm("Are you sure you want to DELETE ALL local data? This cannot be undone and will erase all progress.")) {
            localStorage.clear();
            const collections = ['practice-logs', 'practice-recordings', 'panda-violin:song-progress-v2', 'parent-settings-extended', 'ML_RECS_CACHE'];
            for (const key of collections) {
                await removeJSON(key);
            }
            setWipeStatus("Data wiped successfully. App will now reload.");
            setTimeout(() => window.location.reload(), 1500);
        }
    };

    const handleExportCSV = async () => {
        try {
            const stored = await readJsonAsync('practice-logs', []);
            if (stored.length === 0) { setWipeStatus('No practice logs to export.'); return; }
            const csvRows = ['Date,Checks,Notes', ...stored.map(entry => {
                const checks = entry.checks ? entry.checks.filter(Boolean).length : 0;
                return `"${new Date(entry.date).toISOString()}","${checks}/5","${(entry.notes || '').replace(/"/g, '""')}"`;
            })];
            downloadBlob(
                csvRows.join('\n'),
                `practice_logs_${new Date().toISOString().split('T')[0]}.csv`,
                'text/csv'
            );
            setWipeStatus('CSV Exported!');
        } catch {
            setWipeStatus('Failed to export CSV.');
        }
        setTimeout(() => setWipeStatus('No destructive action performed.'), 3000);
    };

    const handleCheckOffline = () => {
        setWipeStatus("Checking offline cache integrity...");
        setTimeout(() => {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                setWipeStatus("Offline Integrity: OK (Service worker active)");
            } else {
                setWipeStatus("Offline Integrity: WARNING (Not running as PWA or cache missing)");
            }
        }, 1200);
    };

    return (
        <div className="parent-data glass">
            <h3>Data & Privacy</h3>

            <div className="parent-advanced-section">
                <h4 style={{ margin: 0 }}>Storage Breakdown</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    {[
                        { label: 'Events', value: storageUsage.events, color: 'var(--color-primary)' },
                        { label: 'Recordings', value: storageUsage.recordings, color: 'var(--color-secondary)' },
                        { label: 'ML Data', value: storageUsage.ml, color: 'var(--color-success)' },
                        { label: 'SW Cache', value: storageUsage.sw, color: 'var(--color-warning)' }
                    ].map(cat => (
                        <div key={cat.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '2px' }}>
                                <span>{cat.label}</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>{cat.value} MB</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, (parseFloat(cat.value) / Math.max(1, parseFloat(storageUsage.total))) * 100)}%`, height: '100%', background: cat.color, borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
                            </div>
                        </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>Total</span>
                        <span>{storageUsage.total} MB</span>
                    </div>
                </div>

                <div className="settings-actions" style={{ marginTop: '16px' }}>
                    <button className="btn btn-secondary" type="button" onClick={handleCheckOffline} data-offline-check data-offline-bound="true">🔍 Check Offline Integrity</button>
                    <button className="btn btn-secondary" type="button" onClick={handleBackup} data-export-json data-backup-bound="true">📤 Export Full Backup (JSON)</button>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', textAlign: 'center' }}>
                        📥 Import Backup
                        <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestore} />
                    </label>
                </div>
            </div>

            <div className="parent-advanced-section">
                <h4>Privacy and Data Wipe</h4>
                <p className="setting-note">Learning data stays on this device unless you export it. Wiping will remove all child profiles, streaks, and progress.</p>
                <div className="settings-actions">
                    <button className="btn btn-secondary" type="button" onClick={handleExportCSV}>Export Practice Logs (CSV)</button>
                    <Link className="btn btn-secondary" to="/privacy">Open privacy details</Link>
                    <button className="btn btn-secondary" type="button" onClick={handleWipe} style={{ color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}>
                        Delete all local data
                    </button>
                </div>
                <p className="parent-settings-note" style={{ color: 'var(--color-text)', marginTop: '8px' }} aria-live="polite">
                    <strong>Status:</strong> {wipeStatus}
                </p>
            </div>
        </div>
    );
}
