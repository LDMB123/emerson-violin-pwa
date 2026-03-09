import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/rhythm-dash.js';

export function RhythmDashGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="rhythm-dash" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="rhythm-dash-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
