import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/tuning-time.js';

export function TuningTimeGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="tuning-time" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="tuning-time-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
