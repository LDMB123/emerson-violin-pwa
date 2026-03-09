import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { init as initWipers } from '../../games/wipers.js';

export function WipersGame() {
    return (
        <CanvasGameRunner gameId="wipers" bindCanvasEngine={() => initWipers()}>
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px 20px', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    Score: <span id="wipers-score">0 / 20</span>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: 20, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                <button id="wipers-start-btn" style={{ padding: '15px 30px', fontSize: '1.2rem', borderRadius: '30px', background: '#4CAF50', color: 'white', border: 'none' }}>
                    Start Engine
                </button>
            </div>

            <canvas id="wipers-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
