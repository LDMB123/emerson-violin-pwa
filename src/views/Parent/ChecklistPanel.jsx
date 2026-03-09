import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { readJsonAsync, writeJsonAsync } from '../../utils/storage-utils.js';
import { downloadBlob } from '../../utils/download-blob.js';

const CHECKLIST_AXES = [
    { key: 'bowHold', label: 'Bow Hold', prompt: 'Is the right thumb bent into a "bump"?' },
    { key: 'posture', label: 'Posture', prompt: 'Are the shoulders soft and relaxed?' },
    { key: 'toneQuality', label: 'Tone Quality', prompt: 'Is the bow staying parallel to the bridge?' },
    { key: 'rhythm', label: 'Rhythm', prompt: 'Are they stopping the bow on time?' },
    { key: 'leftHand', label: 'Left Hand', prompt: 'Are the fingers curved like a tunnel?' },
];

export function ChecklistPanel() {
    const [status, setStatus] = useState('');
    const [ratings, setRatings] = useState({ bowHold: 0, posture: 0, toneQuality: 0, rhythm: 0, leftHand: 0 });
    const [notes, setNotes] = useState('');
    const [history, setHistory] = useState([]);

    useEffect(() => {
        readJsonAsync('practice-logs', []).then(logs => {
            setHistory(logs.reverse());
        });
    }, []);

    const handleRating = (key, value) => {
        setRatings(prev => ({ ...prev, [key]: value }));
    };

    const handleLog = async () => {
        const entry = { id: Date.now(), date: new Date().toISOString(), ratings, notes };
        const stored = await readJsonAsync('practice-logs', []);
        stored.push(entry);
        await writeJsonAsync('practice-logs', stored);

        setHistory(stored.slice().reverse());
        setStatus('Observation saved.');
        setRatings({ bowHold: 0, posture: 0, toneQuality: 0, rhythm: 0, leftHand: 0 });
        setNotes('');
        setTimeout(() => setStatus(''), 3000);
    };

    const getAvgRating = (entry) => {
        if (entry.ratings) {
            const vals = Object.values(entry.ratings).filter(v => v > 0);
            return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
        }
        // Legacy boolean format
        if (entry.checks) return (entry.checks.filter(Boolean).length) + '/5';
        return '—';
    };

    const handleExportPDF = async () => {
        const stored = await readJsonAsync('practice-logs', []);
        if (stored.length === 0) {
            setStatus('No logs to export.');
            setTimeout(() => setStatus(''), 3000);
            return;
        }
        try {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text("Practice Observations Log", 10, 10);
            let y = 20;
            doc.setFontSize(11);
            stored.forEach((entry) => {
                const dateStr = new Date(entry.date).toLocaleDateString();
                const avg = getAvgRating(entry);
                doc.text(`${dateStr}  Avg: ${avg}  ${entry.notes || ''}`, 10, y);
                y += 8;
                if (y > 280) { doc.addPage(); y = 20; }
            });
            doc.save("practice-logs.pdf");
            setStatus('Exported PDF!');
        } catch (e) {
            console.error(e);
            setStatus('Failed to export PDF.');
        }
        setTimeout(() => setStatus(''), 3000);
    };

    const handleExportCSV = async () => {
        const stored = await readJsonAsync('practice-logs', []);
        if (stored.length === 0) {
            setStatus('No logs to export.');
            setTimeout(() => setStatus(''), 3000);
            return;
        }
        try {
            const header = 'Date,Bow Hold,Posture,Tone Quality,Rhythm,Left Hand,Avg,Notes\n';
            const rows = stored.map(entry => {
                const d = new Date(entry.date).toLocaleDateString();
                if (entry.ratings) {
                    const r = entry.ratings;
                    const vals = Object.values(r).filter(v => v > 0);
                    const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '';
                    return `${d},${r.bowHold || ''},${r.posture || ''},${r.toneQuality || ''},${r.rhythm || ''},${r.leftHand || ''},${avg},"${(entry.notes || '').replace(/"/g, '""')}"`;
                }
                // Legacy
                const checks = entry.checks || [];
                return `${d},${checks[0] ? 'Y' : 'N'},${checks[1] ? 'Y' : 'N'},${checks[2] ? 'Y' : 'N'},${checks[3] ? 'Y' : 'N'},${checks[4] ? 'Y' : 'N'},,"${(entry.notes || '').replace(/"/g, '""')}"`;
            }).join('\n');
            const blob = new Blob([header + rows], { type: 'text/csv' });
            downloadBlob(blob, 'practice-observations.csv');
            setStatus('Exported CSV!');
        } catch (e) {
            console.error(e);
            setStatus('Failed to export CSV.');
        }
        setTimeout(() => setStatus(''), 3000);
    };

    return (
        <div className="parent-home-teacher glass">
            <h3>Home Practice Observation</h3>
            <p className="parent-settings-note">Rate each area from 1–5 based on today's practice.</p>

            <div className="teacher-focus-card">
                {CHECKLIST_AXES.map(axis => (
                    <div key={axis.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '0.95rem' }}>{axis.label}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{axis.prompt}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} type="button"
                                    onClick={() => handleRating(axis.key, n)}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                                        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                                        background: ratings[axis.key] >= n ? 'var(--color-primary)' : 'rgba(0,0,0,0.08)',
                                        color: ratings[axis.key] >= n ? '#fff' : 'var(--color-text-muted)',
                                        transition: 'all 0.15s'
                                    }}
                                    aria-label={`Rate ${axis.label} ${n}`}
                                >{n}</button>
                            ))}
                        </div>
                    </div>
                ))}
                <div style={{ marginTop: '16px' }}>
                    <label>
                        <span style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--color-text-muted)' }}>Notes</span>
                        <textarea
                            className="parent-goal-input"
                            rows="3"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Good focus today. Bow hold improved since last week."
                            style={{ width: '100%', resize: 'vertical' }}
                        ></textarea>
                    </label>
                </div>
            </div>

            <div className="parent-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                <button className="btn btn-primary" type="button" onClick={handleLog}>Save Observation</button>
                <button className="btn btn-ghost" type="button" onClick={handleExportCSV}>Export CSV</button>
                <button className="btn btn-ghost" type="button" onClick={handleExportPDF}>Export PDF</button>
            </div>
            {status && <p className="parent-settings-note" style={{ color: 'var(--color-success)', marginTop: '8px' }} aria-live="polite">{status}</p>}

            {history.length === 0 && (
                <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 'var(--space-4)', textAlign: 'center' }}>
                    <img src="/assets/illustrations/mascot-reading.png" alt="Panda reading checklist" style={{ width: 140, height: 140, marginBottom: 'var(--space-3)' }} />
                    <h4 style={{ marginBottom: 'var(--space-2)' }}>No Observations Yet</h4>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>Rate your child's practice today to start building a log!</p>
                </div>
            )}

            {history.length > 0 && (
                <div style={{ marginTop: 'var(--space-6)', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 'var(--space-4)' }}>
                    <h4 style={{ marginBottom: 'var(--space-3)' }}>Past Observations</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {history.slice(0, 5).map(entry => (
                            <div key={entry.id || entry.date} style={{ background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                                    {new Date(entry.date).toLocaleDateString()} &middot; Avg: {getAvgRating(entry)}
                                </div>
                                {entry.notes && <div style={{ fontSize: '0.95rem' }}>{entry.notes}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
