import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/string-quest.js';

export function StringQuestGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="string-quest" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="string-quest-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
