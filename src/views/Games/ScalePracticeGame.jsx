import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/scale-practice.js';

export function ScalePracticeGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="scale-practice" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="scale-practice-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
