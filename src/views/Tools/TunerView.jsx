import React from 'react';
import { Typography } from '../../components/primitives/Typography.jsx';
import { PermissionGate } from '../../components/shared/PermissionGate.jsx';
import { SharedViewHeader } from '../../components/shared/SharedViewHeader.jsx';
import styles from './TunerView.module.css';
import { getPublicAssetPath } from '../../utils/public-asset-path.js';

export function TunerView() {
    return (
        <section className={`view game-view ${styles.tunerView}`} id="view-tuner" aria-label="Tuner" style={{ display: 'block' }}>
            <SharedViewHeader
                title="Tuner"
                backTo="/tools"
                heroSrc="./assets/illustrations/mascot-focus.webp"
                heroAlt="Panda listening closely for your tuning"
            />

            <Typography className="view-lead">Tune with live listening or tap a reference tone before you play.</Typography>

            <PermissionGate permissionType="microphone" required={true}>
                <div className="tuner-layout">
                    {/* Live Tuner Panel */}
                    <div className="tuner-card glass" id="tuner-live">
                        <picture>
                            <source srcSet={getPublicAssetPath('./assets/illustrations/mascot-focus.webp')} type="image/webp" />
                            <img src={getPublicAssetPath('./assets/illustrations/mascot-focus.webp')} alt="Panda tuning" className="tuner-card-mascot" loading="lazy" decoding="async" width="1024" height="1024" />
                        </picture>
                        <div className="tuner-card-header">
                            <div className="tuner-note-pill">
                                <div className="tuner-note" id="tuner-note">--</div>
                                <div className="tuner-frequency" id="tuner-frequency">0 Hz</div>
                            </div>
                            <span className="rt-listening-chip" data-rt-indicator="true">Mic off</span>
                        </div>
                        <div className="tuner-meter" aria-hidden="true">
                            <svg className="tuner-arc" viewBox="0 0 200 120" width="200" height="120">
                                {/* Color-coded zone arcs */}
                                <path className="tuner-zone tuner-zone--red-l" d="M20,110 A90,90 0 0,1 47,37" fill="none" strokeWidth="12" strokeLinecap="round" />
                                <path className="tuner-zone tuner-zone--yellow-l" d="M47,37 A90,90 0 0,1 80,16" fill="none" strokeWidth="12" strokeLinecap="round" />
                                <path className="tuner-zone tuner-zone--green" d="M80,16 A90,90 0 0,1 120,16" fill="none" strokeWidth="12" strokeLinecap="round" />
                                <path className="tuner-zone tuner-zone--yellow-r" d="M120,16 A90,90 0 0,1 153,37" fill="none" strokeWidth="12" strokeLinecap="round" />
                                <path className="tuner-zone tuner-zone--red-r" d="M153,37 A90,90 0 0,1 180,110" fill="none" strokeWidth="12" strokeLinecap="round" />
                                {/* Center tick mark */}
                                <line x1="100" y1="8" x2="100" y2="18" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" />
                                {/* Needle */}
                                <line className="tuner-needle" x1="100" y1="110" x2="100" y2="22" strokeWidth="3" strokeLinecap="round" />
                                {/* Center pivot */}
                                <circle cx="100" cy="110" r="6" className="tuner-pivot" />
                            </svg>
                        </div>
                        <div className="tuner-cents" id="tuner-cents">±0 cents</div>
                        <div className="tuner-live-status" id="tuner-status" aria-live="polite">Tap Start Listening.</div>
                        <div className="tuner-note-buttons">
                            <button className="tuner-note-btn" type="button" data-tone="G" aria-label="Tune G string">G</button>
                            <button className="tuner-note-btn" type="button" data-tone="D" aria-label="Tune D string">D</button>
                            <button className="tuner-note-btn" type="button" data-tone="A" aria-label="Tune A string">A</button>
                            <button className="tuner-note-btn" type="button" data-tone="E" aria-label="Tune E string">E</button>
                        </div>
                        <div className="tuner-controls">
                            <button className="btn btn-primary tuner-start-big" id="tuner-start" data-rt-toggle="true" type="button">Start Listening</button>
                            <button className="btn btn-secondary" id="tuner-stop" data-rt-stop="true" type="button" disabled>Stop</button>
                        </div>
                    </div>

                    {/* Reference Tones */}
                    <details className="tuner-reference glass" open>
                        <summary>Reference Tones</summary>
                        <p>Tap to hear each open string. Stop listening before playing a reference tone.</p>
                        <div className="reference-grid">
                            {['G3', 'D4', 'A4', 'E5'].map((tone, idx) => {
                                const stringKey = tone.charAt(0);
                                return (
                                    <div key={tone} className="audio-card" data-string={stringKey}>
                                        <span className="audio-label" id={`ref-${tone.toLowerCase()}-label`}>{tone}</span>
                                        <button className="tone-play-btn" type="button" aria-label={`Play ${tone} reference tone`} data-ref-tone={stringKey}>
                                            <svg className="tone-play-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                            <svg className="tone-stop-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                <rect x="6" y="6" width="12" height="12" rx="2" />
                                            </svg>
                                        </button>
                                        <audio preload="none" src={getPublicAssetPath(`./assets/audio/violin-${tone.toLowerCase()}.wav`)} aria-labelledby={`ref-${tone.toLowerCase()}-label`} data-tone-audio={stringKey} hidden></audio>
                                    </div>
                                );
                            })}
                        </div>
                    </details>
                </div>
            </PermissionGate>
        </section>
    );
}
