import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/ear-trainer.js';

export function EarTrainerGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="ear-trainer" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="ear-trainer-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
