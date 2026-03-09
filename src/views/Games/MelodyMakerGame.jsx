import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/melody-maker.js';

export function MelodyMakerGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="melody-maker" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="melody-maker-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
