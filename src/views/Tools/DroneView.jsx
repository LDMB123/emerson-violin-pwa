import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';
import { createAudioContext } from '../../audio/audio-context.js';

const STRINGS = [
    { name: 'G3', freq: 196.00 },
    { name: 'D4', freq: 293.66 },
    { name: 'A4', freq: 440.00 },
    { name: 'E5', freq: 659.25 }
];

export function DroneView() {
    const [activeString, setActiveString] = useState(null);
    const [volume, setVolume] = useState(0.5);
    const [audioError, setAudioError] = useState('');
    const audioCtxRef = useRef(null);
    const oscRefs = useRef([]);
    const gainNodeRef = useRef(null);
    const subGainRefs = useRef([]);

    const stopDrone = () => {
        if (oscRefs.current.length > 0) {
            oscRefs.current.forEach((osc) => {
                try {
                    osc.stop();
                } catch {
                    // Ignore repeated stop attempts during teardown.
                }
                osc.disconnect();
            });
            oscRefs.current = [];
        }
        if (subGainRefs.current.length > 0) {
            subGainRefs.current.forEach((node) => {
                try {
                    node.disconnect();
                } catch {
                    // Ignore disconnect errors during teardown.
                }
            });
            subGainRefs.current = [];
        }
    };

    useEffect(() => {
        return () => {
            stopDrone();
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, []);

    useEffect(() => {
        if (gainNodeRef.current && activeString !== null && audioCtxRef.current) {
            gainNodeRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.05);
        }
    }, [activeString, volume]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'hidden') return;
            stopDrone();
            setActiveString(null);
        };

        const handlePageHide = () => {
            stopDrone();
            setActiveString(null);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide, { passive: true });
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, []);

    const ensureContext = async () => {
        if (audioCtxRef.current?.state === 'closed') {
            audioCtxRef.current = null;
            gainNodeRef.current = null;
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
                gainNodeRef.current = null;
                setAudioError('Audio could not start. Tap a tone again.');
                return null;
            }
        }

        if (!gainNodeRef.current) {
            gainNodeRef.current = audioCtxRef.current.createGain();
            gainNodeRef.current.gain.value = 0;
            gainNodeRef.current.connect(audioCtxRef.current.destination);
        }

        return audioCtxRef.current;
    };

    const toggleDrone = async (str) => {
        if (activeString === str.name) {
            if (!gainNodeRef.current || !audioCtxRef.current) {
                stopDrone();
                setActiveString(null);
                return;
            }
            gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.1);
            setTimeout(() => {
                stopDrone();
                setActiveString(null);
            }, 150);
            return;
        }

        const ctx = await ensureContext();
        if (!ctx || !gainNodeRef.current) return;
        setAudioError('');

        stopDrone();

        const freq = str.freq;
        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = freq;
        osc1.connect(gainNodeRef.current);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq;
        osc2.connect(gainNodeRef.current);

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.value = freq / 2;
        const subGain = ctx.createGain();
        subGain.gain.value = 0.5;
        osc3.connect(subGain);
        subGain.connect(gainNodeRef.current);

        osc1.start();
        osc2.start();
        osc3.start();

        oscRefs.current = [osc1, osc2, osc3];
        subGainRefs.current = [subGain];

        gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
        gainNodeRef.current.gain.setTargetAtTime(volume, ctx.currentTime, 0.1);

        setActiveString(str.name);
    };

    return (
        <section className="view is-active" id="view-drone" aria-label="Tone Lab" style={{ display: 'block' }}>
            <div className="view-header">
                <Link to="/tools" className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back
                </Link>
                <Typography variant="h2" as="h2">Tone Lab</Typography>
            </div>

            <div className="drone-layout" style={{ display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center', marginTop: '40px' }}>
                <div className="drone-visualizer" style={{ width: '200px', height: '200px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {activeString ? (
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', position: 'absolute' }}>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-primary)" strokeWidth="4" opacity="0.3">
                                <animate attributeName="r" values="30;48;30" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="50" cy="50" r="35" fill="none" stroke="var(--color-secondary)" strokeWidth="6" opacity="0.5">
                                <animate attributeName="r" values="25;40;25" dur="1.5s" repeatCount="indefinite" />
                            </circle>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', position: 'absolute' }}>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" opacity="0.1" />
                        </svg>
                    )}
                    <Typography variant="h1" style={{ fontSize: '4rem', zIndex: 1, color: activeString ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        {activeString || '--'}
                    </Typography>
                </div>

                <div className="drone-controls glass" style={{ padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px' }}>
                    <div className="string-buttons" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                        {STRINGS.map((str) => (
                            <button
                                key={str.name}
                                className={`btn ${activeString === str.name ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => {
                                    void toggleDrone(str);
                                }}
                                style={{ height: '80px', fontSize: '1.5rem', borderWidth: '2px', borderStyle: 'solid', borderColor: activeString === str.name ? 'transparent' : 'var(--color-border)' }}
                            >
                                {str.name} Tone
                            </button>
                        ))}
                    </div>

                    <div className="volume-control">
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Volume</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                style={{ width: '100%' }}
                            />
                        </label>
                    </div>

                    {audioError ? (
                        <Typography variant="body" style={{ marginTop: '16px', color: 'var(--color-danger, #c62828)' }}>
                            {audioError}
                        </Typography>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
