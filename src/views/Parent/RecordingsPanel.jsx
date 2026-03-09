import React, { useState, useEffect } from 'react';
import { readJsonAsync, writeJsonAsync } from '../../utils/storage-utils.js';
import { getBlob } from '../../persistence/storage.js';
import { downloadBlob } from '../../utils/download-blob.js';
import { createRetryableModuleLoader } from '../../utils/lazy-module.js';
import { getPublicAssetPath } from '../../utils/public-asset-path.js';

const loadJsZip = createRetryableModuleLoader(() => import('jszip'));

export function RecordingsPanel() {
    const [recordings, setRecordings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [filterSong, setFilterSong] = useState('all');

    useEffect(() => {
        let isMounted = true;
        readJsonAsync('practice-recordings', []).then(stored => {
            if (isMounted) {
                setRecordings(stored);
                setLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, []);

    // Unique song titles for filter dropdown
    const songTitles = [...new Set(recordings.map(r => r.title).filter(Boolean))];
    const filtered = filterSong === 'all' ? recordings : recordings.filter(r => r.title === filterSong);

    // Per-recording share (spec 2405)
    const handleShare = async (rec) => {
        if (!rec.id) return;
        try {
            const blob = await getBlob(rec.id);
            if (!blob) { setStatus('Audio not found.'); return; }
            const ext = blob.type.includes('webm') ? 'webm' : 'wav';
            const file = new File([blob], `${(rec.title || 'recording').replace(/[^a-z0-9]/gi, '_')}.${ext}`, { type: blob.type });
            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: rec.title || 'Practice Recording' });
            } else {
                // Fallback: download
                downloadBlob(blob, file.name);
            }
        } catch (e) {
            if (e.name !== 'AbortError') setStatus('Share failed.');
        }
    };

    // Per-recording delete (spec 2419)
    const handleDelete = async (index) => {
        if (!window.confirm('Delete this recording?')) return;
        const updated = recordings.filter((_, i) => i !== index);
        await writeJsonAsync('practice-recordings', updated);
        setRecordings(updated);
        setStatus('Recording deleted.');
        setTimeout(() => setStatus(''), 3000);
    };

    const handleClear = () => {
        if (window.confirm("Delete all local audio recordings?")) {
            writeJsonAsync('practice-recordings', []).then(() => {
                setRecordings([]);
                setStatus('Recordings cleared.');
                setTimeout(() => setStatus(''), 3000);
            });
        }
    };

    const handleExport = async () => {
        if (recordings.length === 0) {
            setStatus('No recordings to export.');
            setTimeout(() => setStatus(''), 3000);
            return;
        }

        setStatus('Creating archive... Please wait.');
        try {
            const { default: JSZip } = await loadJsZip();
            const zip = new JSZip();
            let addedCount = 0;

            for (const rec of recordings) {
                if (!rec.id) continue;
                const blob = await getBlob(rec.id);
                if (blob) {
                    const ext = blob.type.includes('webm') ? 'webm' : 'wav';
                    const safeTitle = (rec.title || 'recording').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    const filename = `${new Date(rec.date).toISOString().split('T')[0]}_${safeTitle}.${ext}`;
                    zip.file(filename, blob);
                    addedCount++;
                }
            }

            if (addedCount === 0) {
                setStatus('Could not find any audio data to export.');
                setTimeout(() => setStatus(''), 3000);
                return;
            }

            const content = await zip.generateAsync({ type: 'blob' });
            downloadBlob(content, `panda_violin_recordings_${new Date().toISOString().split('T')[0]}.zip`);

            setStatus(`Exported ${addedCount} recordings!`);
        } catch (error) {
            console.error('ZIP Export Failed', error);
            setStatus('Export failed. Please try again.');
        }
        setTimeout(() => setStatus(''), 5000);
    };

    // Estimated storage
    const storageMB = recordings.length > 0 ? (recordings.length * 2.4).toFixed(1) : '0';

    return (
        <div className="parent-recordings glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0 }}>Practice Recordings</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Song filter (spec 2417) */}
                    {songTitles.length > 1 && (
                        <select
                            value={filterSong}
                            onChange={e => setFilterSong(e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.85rem', background: 'var(--color-bg)' }}
                        >
                            <option value="all">All Songs</option>
                            {songTitles.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                    <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleExport} disabled={recordings.length === 0} title="Export all as ZIP">📤</button>
                </div>
            </div>

            {/* Storage usage indicator (spec 2413) */}
            <div style={{ marginBottom: 'var(--space-4)', padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Storage: {storageMB} MB</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{recordings.length} recordings</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(0,0,0,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (parseFloat(storageMB) / 200) * 100)}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '3px' }}></div>
                </div>
            </div>

            <p className="parent-settings-note" data-parent-recordings-status aria-live="polite">
                {loading ? 'Loading recordings…' : status}
            </p>

            <div className="parent-recording-list" data-parent-recordings style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filtered.length === 0 && !loading && (
                    <div className="empty-state" style={{ padding: 'var(--space-4)', textAlign: 'center', background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)' }}>
                        <img src={getPublicAssetPath('./assets/illustrations/empty-no-recordings.png')} alt="Panda waiting for recordings" style={{ width: 140, height: 140, marginBottom: 'var(--space-3)' }} />
                        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>No recordings available yet.</p>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>Use the Practice Coach to record audio!</p>
                    </div>
                )}

                {filtered.map((rec, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <strong style={{ display: 'block' }}>{rec.title || 'Practice Session'}</strong>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span>{new Date(rec.date).toLocaleDateString()}</span>
                                <span>·</span>
                                <span>{rec.duration || '0:00'}</span>
                                {/* Star rating on recording row (spec 2404) */}
                                {rec.stars > 0 && <span style={{ color: 'var(--color-warning)' }}>{'⭐'.repeat(Math.min(5, rec.stars))}</span>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} title="Play">▶</button>
                            <button className="btn btn-ghost" style={{ padding: '8px' }} title="Share" onClick={() => handleShare(rec)}>📤</button>
                            <button className="btn btn-ghost" style={{ padding: '8px', color: 'var(--color-warning)' }} title="Delete" onClick={() => handleDelete(i)}>🗑</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="parent-actions">
                <button className="btn btn-secondary" type="button" onClick={handleClear} disabled={recordings.length === 0}>Clear All</button>
                <button className="btn btn-ghost" type="button" onClick={handleExport} disabled={recordings.length === 0}>Export All (.zip)</button>
            </div>
        </div>
    );
}
