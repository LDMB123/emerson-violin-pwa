import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind as bindPitchQuest } from '../../games/pitch-quest.js';

export function PitchQuestGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="pitch-quest" bindCanvasEngine={bindPitchQuest} onFinish={onFinish}>

            <div className="pitch-quest-stage" style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: '20px', color: 'white', fontFamily: 'Fredoka, sans-serif' }}>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Score</div>
                    <div data-pitch="score" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>0</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Stars</div>
                    <div data-pitch="stars" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>0</div>
                </div>
            </div>

            <div style={{ display: 'none' }}>
                <input type="radio" id="pq-step-1" className="pitch-target-toggle" />
                <input type="radio" id="pq-step-2" className="pitch-target-toggle" />
                <input type="radio" id="pq-step-3" className="pitch-target-toggle" />
                <input type="radio" id="pq-step-4" className="pitch-target-toggle" />
            </div>

            <div style={{ position: 'absolute', bottom: 120, left: '50%', transform: 'translateX(-50%)', zIndex: 10, textAlign: 'center' }}>
                <div data-pitch="status" style={{ color: 'white', fontSize: '1.2rem', marginBottom: '10px' }}>Loading Targets...</div>
                <button data-pitch="check" style={{ padding: '20px 40px', fontSize: '2rem', borderRadius: '30px', background: '#2196F3', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Check Pitch
                </button>
            </div>

            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '16px' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Stability: <span data-pitch="stability">0x</span></div>
                <div data-pitch="feedback" style={{ fontSize: '1rem', fontStyle: 'italic', color: '#ffeb3b' }}>Feedback...</div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', margin: '10px 0' }} data-pitch="live-note">--</div>
                <div data-pitch="offset" style={{ fontSize: '1rem' }}>0 cents</div>

                <div className="pitch-gauge" style={{ width: 100, height: 10, background: '#555', marginTop: 10, position: 'relative' }}></div>
            </div>

            <div style={{ position: 'absolute', right: 20, bottom: 20, width: 40, height: 200, background: '#333', zIndex: 1 }}>
                <div data-pitch="bamboo-fill" style={{ width: '100%', height: 'var(--bamboo-fill, 0%)', background: '#4CAF50', position: 'absolute', bottom: 0, transition: 'height 0.1s' }}></div>
            </div>

            <div style={{ position: 'absolute', inset: 0, background: '#1c2833' }}></div>

        </CanvasGameRunner>
    );
}
