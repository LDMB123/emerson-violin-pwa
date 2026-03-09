import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind as bindBowHero } from '../../games/bow-hero.js';

export function BowHeroGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="bow-hero" bindCanvasEngine={bindBowHero} onFinish={onFinish}>
            {/* Native DOM Nodes mapped to legacy selectors */}
            <input type="checkbox" id="bow-hero-run" style={{ display: 'none' }} />

            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: '20px', color: 'white', fontFamily: 'Fredoka, sans-serif' }}>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Time</div>
                    <div data-bow="timer" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>--:--</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Stars</div>
                    <div data-bow="stars" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>0</div>
                </div>
            </div>

            <div
                data-bow="status"
                style={{
                    position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
                    color: 'white', zIndex: 10, fontSize: '1.2rem', fontFamily: 'Fredoka, sans-serif',
                    background: 'rgba(0,0,0,0.6)', padding: '10px 24px', borderRadius: '30px'
                }}
            >
                Loading...
            </div>

            {/* Array of 5 bow-stars as required by bow-hero logic */}
            <div style={{ position: 'absolute', top: 80, right: 20, zIndex: 10, display: 'flex', gap: '10px' }}>
                <div className="bow-star" style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', transition: 'background 0.3s' }}></div>
                <div className="bow-star" style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', transition: 'background 0.3s' }}></div>
                <div className="bow-star" style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', transition: 'background 0.3s' }}></div>
                <div className="bow-star" style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', transition: 'background 0.3s' }}></div>
                <div className="bow-star" style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', transition: 'background 0.3s' }}></div>
            </div>

            <canvas id="bow-hero-canvas" style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}></canvas>
        </CanvasGameRunner>
    );
}
