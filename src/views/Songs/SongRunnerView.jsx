import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { getSongById } from '../../songs/song-library.js';
import { useNativeSongPlayer } from '../../hooks/useNativeSongPlayer.js';
import { useMediaRecorder } from '../../hooks/useMediaRecorder.js';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary.jsx';
import { Button } from '../../components/primitives/Button.jsx';
import { Typography } from '../../components/primitives/Typography.jsx';
import { PermissionGate } from '../../components/shared/PermissionGate.jsx';
import { GAME_RECORDED } from '../../utils/event-names.js';

function SongRunnerContent({ propSongId, onComplete }) {
    const params = useParams();
    const songId = propSongId || params.songId;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const containerRef = useRef(null);

    const [song, setSong] = useState(null);
    const [sheetHtml, setSheetHtml] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [tempoScale, setTempoScale] = useState(1);
    const [waitMode, setWaitMode] = useState(false);
    const [playMelody, setPlayMelody] = useState(true);
    const [metronome, setMetronome] = useState(true);
    const [loopSection, setLoopSection] = useState(null);

    const isRecordIntent = searchParams.get('record') === '1';

    // Hook: Media Recorder
    const { isRecording, durationSecs, startRecording, stopRecording } = useMediaRecorder({
        songId,
        onFinish: (result) => {
            console.log('Recording finished:', result.duration, 'secs');
            // Mock dispatching legacy RECORDED event for progression logic
            document.dispatchEvent(new CustomEvent(GAME_RECORDED, {
                detail: { score: 100, stars: 3, accuracy: 100 }
            }));
            navigate(`/songs/${songId}`);
        }
    });

    // Hook: Native Song Player
    const handleSongFinish = useCallback(() => {
        setIsPlaying(false);
        if (isRecording) {
            stopRecording();
        }
    }, [isRecording, stopRecording]);

    const { status, currentNote } = useNativeSongPlayer({
        songId,
        containerRef,
        isPlaying,
        tempoScale,
        waitMode,
        playMelody,
        metronome,
        sectionStart: loopSection?.start || 0,
        sectionEnd: loopSection?.end || null,
        onFinish: handleSongFinish
    });

    // Fetch Song Data and HTML
    useEffect(() => {
        let mounted = true;

        const loadSong = async () => {
            if (!songId) return;
            setLoading(true);
            try {
                const data = await getSongById(songId);
                if (!mounted) return;
                setSong(data);

                const response = await fetch(`/views/songs/${songId}.html`);
                if (!response.ok) throw new Error('Song HTML not found');
                const htmlText = await response.text();

                // Extract only the .song-sheet from the old full-view legacy html
                const div = document.createElement('div');
                div.innerHTML = htmlText;
                const sheet = div.querySelector('.song-sheet');
                if (sheet) {
                    if (!sheet.querySelector('.song-playhead')) {
                        const playhead = document.createElement('div');
                        playhead.className = 'song-playhead';
                        sheet.appendChild(playhead);
                    }
                    setSheetHtml(sheet.outerHTML);
                } else {
                    setSheetHtml('<div class="song-sheet glass"><div style="padding:40px;text-align:center;">Sheet generation failed</div></div>');
                }

                setLoading(false);
            } catch (err) {
                console.error(`Failed to load song ${songId}:`, err);
                if (mounted) setError(err);
            }
        };

        loadSong();
        return () => { mounted = false; };
    }, [songId]);

    // Handle auto-record intent
    useEffect(() => {
        if (!loading && !error && sheetHtml && isRecordIntent && !isRecording && !isPlaying) {
            setIsPlaying(true);
            startRecording();
        }
    }, [loading, error, sheetHtml, isRecordIntent, isRecording, isPlaying, startRecording]);

    // MediaSession metadata: show song title in Now Playing (spec line 376)
    useEffect(() => {
        if (song && 'mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: song.title || songId.replace(/-/g, ' '),
                    artist: 'Panda Violin',
                    album: `${song.tier || 'Practice'} Songs`,
                });
            } catch (_) { /* graceful degradation */ }
        }
    }, [song, songId]);

    if (error) {
        return (
            <div className="view is-active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
                <Typography variant="h2" style={{ marginBottom: 16 }}>Oops! Song failed to load.</Typography>
                <Button variant="primary" onClick={() => navigate('/songs')}>Back to Songs</Button>
            </div>
        );
    }

    if (loading || !sheetHtml) {
        return (
            <div className="view is-active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="h3" style={{ color: 'var(--color-primary)' }}>Tuning up...</Typography>
            </div>
        );
    }

    return (
        <section className="view song-view is-active" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Header Area */}
            <div className="view-header" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                <div style={{ flexShrink: 0 }}>
                    <Button variant="ghost" onClick={() => { stopRecording(); onComplete ? onComplete() : navigate(`/songs/${songId}`); }} style={{ padding: '8px 12px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                            <path d="M15 18l-6-6 6-6" />
                        </svg> {onComplete ? 'Done' : 'Exit'}
                    </Button>
                </div>

                <div style={{ flex: 1 }}>
                    <Typography variant="h3" style={{ margin: 0, textTransform: 'capitalize' }}>
                        {song?.title || songId.replace(/-/g, ' ')}
                    </Typography>
                </div>

                {isRecording && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30', padding: '6px 12px', borderRadius: '16px', fontWeight: 'bold' }}>
                        <div className="pulse-indicator" style={{ width: 10, height: 10, background: '#FF3B30', borderRadius: '50%' }}></div>
                        Recording {Math.floor(durationSecs / 60)}:{(durationSecs % 60).toString().padStart(2, '0')}
                    </div>
                )}
            </div>

            {/* Song Sheet Render Block */}
            <div
                ref={containerRef}
                style={{ flex: 1, position: 'relative', overflowY: 'auto', padding: 'var(--space-4)' }}
            >
                {/* CSS hack to natively trigger app.css animations logic */}
                <input type="checkbox" className="song-play-toggle" checked={isPlaying} readOnly style={{ display: 'none' }} />
                {/* Notice we dump the raw extracted class="song-sheet" inside this */}
                <div dangerouslySetInnerHTML={{ __html: sheetHtml }} />
            </div>

            {/* Native Advanced Controls Footer */}
            <div className="glass" style={{ margin: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>

                    {song?.sections?.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderRight: '1px solid rgba(0,0,0,0.1)', paddingRight: '16px' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Loop:</span>
                            <button className="btn" onClick={() => setLoopSection(null)} style={{ padding: '6px 12px', background: !loopSection ? 'var(--color-primary)' : 'transparent', color: !loopSection ? '#fff' : 'var(--color-text)', border: '2px solid rgba(0,0,0,0.1)' }}>Full</button>
                            {song.sections.map(s => (
                                <button key={s.id} className="btn" onClick={() => setLoopSection(s)} style={{ padding: '6px 12px', background: loopSection?.id === s.id ? 'var(--color-primary)' : 'transparent', color: loopSection?.id === s.id ? '#fff' : 'var(--color-text)', border: '2px solid rgba(0,0,0,0.1)' }}>{s.label}</button>
                            ))}
                        </div>
                    )}

                    <label style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '150px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Tempo</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="range" min="50" max="130" step="5"
                                value={Math.round(tempoScale * 100)}
                                onChange={(e) => setTempoScale(parseInt(e.target.value, 10) / 100)}
                                style={{ flex: 1 }}
                            />
                            <strong>{Math.round(tempoScale * 100)}%</strong>
                        </div>
                    </label>

                    <Button variant={isPlaying ? "secondary" : "primary"} onClick={() => setIsPlaying(!isPlaying)} style={{ flexShrink: 0, padding: '10px 40px', fontSize: '1.2rem' }}>
                        {isPlaying ? '⏹ Pause' : '▶️ Play'}
                    </Button>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={waitMode} onChange={e => setWaitMode(e.target.checked)} />
                        Wait for me
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={playMelody} onChange={e => setPlayMelody(e.target.checked)} />
                        Play Melody
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={metronome} onChange={e => setMetronome(e.target.checked)} />
                        Metronome
                    </label>
                </div>
            </div>

        </section>
    );
}

export function SongRunnerView({ propSongId, onComplete }) {
    return (
        <ErrorBoundary>
            <PermissionGate permissionType="microphone" required={true}>
                <SongRunnerContent propSongId={propSongId} onComplete={onComplete} />
            </PermissionGate>
        </ErrorBoundary>
    );
}
