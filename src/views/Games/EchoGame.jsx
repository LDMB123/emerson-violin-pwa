import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { init as initEcho } from '../../games/echo.js';

export function EchoGame() {
    return (
        <CanvasGameRunner gameId="echo" bindCanvasEngine={() => initEcho()}>
            <div data-echo="curtain" style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                <button data-echo="start" style={{ padding: '20px 40px', fontSize: '2rem', borderRadius: '30px', background: '#FF5722', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Start Echo
                </button>
            </div>

            <canvas id="echo-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
