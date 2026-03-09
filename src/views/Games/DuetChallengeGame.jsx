import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/duet-challenge.js';

export function DuetChallengeGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="duet-challenge" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="duet-challenge-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
