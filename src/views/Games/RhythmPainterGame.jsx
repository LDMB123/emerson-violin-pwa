import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/rhythm-painter.js';

export function RhythmPainterGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="rhythm-painter" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="rhythm-painter-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
