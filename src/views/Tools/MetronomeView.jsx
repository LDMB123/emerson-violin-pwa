import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/primitives/Button.jsx';
import { Typography } from '../../components/primitives/Typography.jsx';
import { useTapTempo } from '../../hooks/useTapTempo.js';
import { createAudioContext } from '../../audio/audio-context.js';

export function MetronomeView() {
    const [bpm, setBpm] = useState(100);
    const [isPlaying, setIsPlaying] = useState(false);
    const [subdivision, setSubdivision] = useState(1); // 1 = quarter, 2 = eighth, 3 = triplet
    const [flash, setFlash] = useState(false);
    const [audioError, setAudioError] = useState('');

    const { handleTap: tapTempoTap } = useTapTempo({
        minBpm: 40, maxBpm: 208, windowMs: 2000, maxTaps: 4,
        onBpm: (computed) => setBpm(computed),
    });

    // Audio context and scheduler state
    const audioCtxRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const currentNoteRef = useRef(0);
    const timerIDRef = useRef(null);
    const isPlayingRef = useRef(false);
    const resumeAfterVisibilityRef = useRef(false);

    // To use current BPM and Subdivision in the scheduler without stale closures
    const bpmRef = useRef(bpm);
    const subRef = useRef(subdivision);

    useEffect(() => {
        bpmRef.current = bpm;
        subRef.current = subdivision;
    }, [bpm, subdivision]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        return () => {
            if (timerIDRef.current) clearTimeout(timerIDRef.current);
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, []);

    const ensureContext = useCallback(async () => {
        if (audioCtxRef.current?.state === 'closed') {
            audioCtxRef.current = null;
        }
        if (!audioCtxRef.current) {
            audioCtxRef.current = createAudioContext({ latencyHint: 'interactive' });
        }
        if (!audioCtxRef.current) {
            setAudioError('Audio is unavailable on this device.');
            return null;
        }
        if (audioCtxRef.current.state === 'suspended' || audioCtxRef.current.state === 'interrupted') {
            try {
                await audioCtxRef.current.resume();
            } catch {
                audioCtxRef.current.close().catch(() => {});
                audioCtxRef.current = null;
                setAudioError('Audio could not start. Tap Play again.');
                return null;
            }
        }
        return audioCtxRef.current;
    }, []);

    const nextNote = useCallback(() => {
        const secondsPerBeat = 60.0 / bpmRef.current;
        nextNoteTimeRef.current += secondsPerBeat / subRef.current;
        currentNoteRef.current += 1;
        if (currentNoteRef.current >= subRef.current * 4) {
            currentNoteRef.current = 0; // 4/4 time signature
        }
    }, []);

    const scheduleNote = useCallback((beatNumber, time) => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const envelope = ctx.createGain();
        osc.connect(envelope);
        envelope.connect(ctx.destination);

        const isDownbeat = beatNumber % subRef.current === 0;
        const isFirstBeat = isDownbeat && beatNumber === 0;

        if (isDownbeat) {
            osc.frequency.value = isFirstBeat ? 880.0 : 440.0;
        } else {
            osc.frequency.value = 220.0;
        }

        envelope.gain.value = 1;
        envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.05);

        if (isDownbeat) {
            const diff = time - ctx.currentTime;
            requestAnimationFrame(() => {
                setTimeout(() => {
                    setFlash(true);
                    setTimeout(() => setFlash(false), 100);
                }, Math.max(0, diff * 1000));
            });
        }
    }, []);

    const scheduler = useCallback(() => {
        const scheduleAheadTime = 0.1;
        const lookahead = 25.0;

        if (!audioCtxRef.current) return;

        while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + scheduleAheadTime) {
            scheduleNote(currentNoteRef.current, nextNoteTimeRef.current);
            nextNote();
        }
        timerIDRef.current = setTimeout(scheduler, lookahead);
    }, [nextNote, scheduleNote]);

    const stopMetronome = useCallback(() => {
        if (timerIDRef.current) {
            clearTimeout(timerIDRef.current);
            timerIDRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    const startMetronome = useCallback(async () => {
        const ctx = await ensureContext();
        if (!ctx) return false;
        setAudioError('');
        setIsPlaying(true);
        currentNoteRef.current = 0;
        nextNoteTimeRef.current = ctx.currentTime + 0.05;
        scheduler();
        return true;
    }, [ensureContext, scheduler]);

    const togglePlay = useCallback(async () => {
        if (isPlayingRef.current) {
            stopMetronome();
            return;
        }
        await startMetronome();
    }, [startMetronome, stopMetronome]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                resumeAfterVisibilityRef.current = isPlayingRef.current;
                stopMetronome();
                return;
            }
            if (resumeAfterVisibilityRef.current) {
                resumeAfterVisibilityRef.current = false;
                void startMetronome();
            }
        };

        const handlePageHide = () => {
            resumeAfterVisibilityRef.current = false;
            stopMetronome();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide, { passive: true });
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [startMetronome, stopMetronome]);

    const handleTapTempo = () => {
        tapTempoTap();
        setFlash(true);
        setTimeout(() => setFlash(false), 100);
    };

    const updateBpm = (newBpm) => {
        setBpm(Math.max(40, Math.min(208, newBpm)));
    };

    return (
        <section className={`view is-active metronome-view ${flash ? 'flash' : ''}`} id="view-metronome" aria-label="Metronome" style={{ display: 'block' }}>
            <div className="view-header">
                <Link to="/tools" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <Typography variant="h2" as="h2">Metronome</Typography>
            </div>

            <style>{`
                .metronome-view {
                    transition: background-color 0.1s ease-out;
                }
                .metronome-view.flash {
                    background-color: var(--color-primary-light);
                }
                .metronome-circle {
                    width: 240px;
                    height: 240px;
                    border-radius: 50%;
                    border: 8px solid var(--color-primary);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    margin: 0 auto;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    background: var(--color-surface);
                    position: relative;
                    transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .metronome-view.flash .metronome-circle {
                    transform: scale(1.05);
                    border-color: var(--color-secondary);
                }
                .bpm-display {
                    font-size: 5rem;
                    font-weight: 800;
                    line-height: 1;
                    color: var(--color-text);
                    font-variant-numeric: tabular-nums;
                }
                .bpm-label {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--color-text-muted);
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                .metronome-layout {
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                    padding: 24px;
                    maxWidth: 500px;
                    margin: 0 auto;
                }
                .controls-row {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 20px;
                }
                .subdivision-pills {
                    display: flex;
                    background: rgba(0,0,0,0.05);
                    border-radius: 20px;
                    padding: 4px;
                }
                .subdivision-pill {
                    padding: 8px 16px;
                    border-radius: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    color: var(--color-text-muted);
                    border: none;
                    background: transparent;
                }
                .subdivision-pill.active {
                    background: var(--color-surface);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    color: var(--color-primary);
                }
            `}</style>

            <div className="metronome-layout">
                <div className="metronome-circle">
                    <span className="bpm-display">{bpm}</span>
                    <span className="bpm-label">BPM</span>
                </div>

                <div className="controls-row">
                    <Button variant="ghost" size="giant" onClick={() => updateBpm(bpm - 1)} aria-label="Decrease BPM" style={{ fontSize: '2rem' }}>-</Button>
                    <input
                        type="range"
                        min="40"
                        max="208"
                        value={bpm}
                        onChange={(e) => updateBpm(parseInt(e.target.value, 10))}
                        style={{ width: '100%', height: '8px', accentColor: 'var(--color-primary)' }}
                    />
                    <Button variant="ghost" size="giant" onClick={() => updateBpm(bpm + 1)} aria-label="Increase BPM" style={{ fontSize: '2rem' }}>+</Button>
                </div>

                <div className="controls-row">
                    <div className="subdivision-pills">
                        <button className={`subdivision-pill ${subdivision === 1 ? 'active' : ''}`} onClick={() => setSubdivision(1)}>♩</button>
                        <button className={`subdivision-pill ${subdivision === 2 ? 'active' : ''}`} onClick={() => setSubdivision(2)}>♪♪</button>
                        <button className={`subdivision-pill ${subdivision === 3 ? 'active' : ''}`} onClick={() => setSubdivision(3)}>♪♪♪</button>
                    </div>
                </div>

                <div className="controls-row" style={{ marginTop: '16px' }}>
                    <Button
                        variant={isPlaying ? 'secondary' : 'primary'}
                        size="giant"
                        onClick={togglePlay}
                        style={{ flex: 1, height: '80px', fontSize: '1.5rem' }}
                    >
                        {isPlaying ? 'Stop' : 'Play'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="giant"
                        onClick={handleTapTempo}
                        style={{ flex: 1, height: '80px', fontSize: '1.5rem', background: 'var(--color-surface)' }}
                    >
                        Tap Tempo
                    </Button>
                </div>

                {audioError ? (
                    <Typography variant="body" style={{ margin: 0, textAlign: 'center', color: 'var(--color-danger, #c62828)' }}>
                        {audioError}
                    </Typography>
                ) : null}
            </div>
        </section>
    );
}
