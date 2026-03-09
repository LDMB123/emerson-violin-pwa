import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Typography } from '../../components/primitives/Typography.jsx';

const attachStreamToVideoElement = (video, stream) => {
    if (!video) return;
    try {
        video.srcObject = stream;
    } catch {
        // Some WebKit builds reject synthetic test streams; the React state still tracks readiness.
    }
    video.dataset.hasSrcObject = stream ? 'true' : 'false';
    if (stream) {
        void video.play?.().catch(() => {});
    }
};

export function PostureView({ onComplete }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraStarting, setCameraStarting] = useState(false);
    const [streamAttached, setStreamAttached] = useState(false);
    const [error, setError] = useState(null);

    const startCamera = async () => {
        if (cameraActive || cameraStarting) return;
        try {
            setCameraStarting(true);
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            streamRef.current = stream;
            attachStreamToVideoElement(videoRef.current, stream);
            setStreamAttached(true);
            setCameraActive(true);
        } catch (err) {
            console.error("Failed to start camera:", err);
            setError("Camera access denied or unavailable. Please enable permissions.");
            setStreamAttached(false);
            setCameraActive(false);
        } finally {
            setCameraStarting(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.dataset.hasSrcObject = 'false';
        }
        setStreamAttached(false);
        setCameraStarting(false);
        setCameraActive(false);
    };

    useEffect(() => {
        if (cameraActive && streamRef.current) {
            attachStreamToVideoElement(videoRef.current, streamRef.current);
        }
    }, [cameraActive, streamAttached]);

    useEffect(() => {
        // Cleanup on unmount
        return () => stopCamera();
    }, []);

    return (
        <section className="view game-view is-active" id="view-posture" aria-label="Posture Coach" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className="view-header" style={{ flexShrink: 0, zIndex: 10 }}>
                <Link to="/tools" onClick={(e) => {
                    if (onComplete) { e.preventDefault(); onComplete(); }
                    stopCamera();
                }} className="back-btn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    {onComplete ? 'Complete' : 'Back'}
                </Link>
                <Typography variant="h2" as="h2">Posture Check</Typography>
            </div>

            <div className="posture-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ flex: 1, position: 'relative', background: '#000', borderRadius: '16px', overflow: 'hidden', margin: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                    {!cameraActive && !error && (
                        <div style={{ textAlign: 'center', padding: '24px' }}>
                            <Typography variant="h3" style={{ color: '#fff', marginBottom: '16px' }}>Ready to check your posture?</Typography>
                            <button className="btn btn-primary" onClick={startCamera} disabled={cameraStarting}>
                                {cameraStarting ? 'Starting Camera...' : 'Start Camera'}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#FF3B30' }}>
                            <Typography variant="h3">{error}</Typography>
                            <button className="btn btn-secondary" onClick={startCamera} style={{ marginTop: '16px' }}>Try Again</button>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        data-has-src-object={streamAttached ? 'true' : 'false'}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)', // Mirror image for natural self-view
                            display: cameraActive ? 'block' : 'none'
                        }}
                    />

                    {/* Silhouette Overlay */}
                    {cameraActive && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            pointerEvents: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.6
                        }}>
                            <svg viewBox="0 0 400 500" style={{ width: '80%', height: '80%', maxWidth: '400px' }}>
                                {/* Stylized abstract geometric silhouette guides */}
                                {/* Head Outline */}
                                <ellipse cx="200" cy="120" rx="60" ry="75" fill="none" stroke="#fff" strokeWidth="4" strokeDasharray="10 10" />
                                {/* Shoulders - Straight Line Target */}
                                <line x1="80" y1="230" x2="320" y2="230" stroke="#34C759" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
                                {/* Violin Position angle -> roughly 45 degrees left */}
                                <line x1="140" y1="230" x2="60" y2="350" stroke="#FF9500" strokeWidth="12" strokeLinecap="round" opacity="0.6" />
                                {/* Bow Arm Position -> roughly right-side curve */}
                                <path d="M 280 230 Q 380 280 300 400" fill="none" stroke="#007AFF" strokeWidth="6" strokeDasharray="15 10" strokeLinecap="round" />
                            </svg>
                        </div>
                    )}
                </div>

                <div className="posture-tips glass" style={{ margin: '0 16px 16px 16px' }}>
                    <Typography variant="h4" style={{ marginBottom: '8px' }}>Posture checklist:</Typography>
                    <ul className="game-tip-list" style={{ margin: 0 }}>
                        <li><span style={{ color: '#34C759', fontWeight: 'bold' }}>Green</span>: Are your shoulders relaxed and level?</li>
                        <li><span style={{ color: '#FF9500', fontWeight: 'bold' }}>Orange</span>: Is the violin sitting high on your collarbone?</li>
                        <li><span style={{ color: '#007AFF', fontWeight: 'bold' }}>Blue</span>: Is your bow arm forming a relaxed square?</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
