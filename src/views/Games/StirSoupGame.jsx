import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { init as initStirSoup } from '../../games/stir-soup.js';

export function StirSoupGame() {
    return (
        <CanvasGameRunner gameId="stir-soup" bindCanvasEngine={() => initStirSoup()}>
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px' }}>
                <div>Score: <span id="stir-score">0</span></div>
                <div>Smoothness: <span id="stir-smoothness">100%</span></div>
            </div>

            <div style={{ position: 'absolute', bottom: 20, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                <button id="stir-start-btn" style={{ padding: '15px 30px', fontSize: '1.2rem', borderRadius: '30px' }}>
                    Start Stirring
                </button>
            </div>

            <canvas id="stir-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
