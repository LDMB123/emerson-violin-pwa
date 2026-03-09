import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/pizzicato.js';

export function PizzicatoGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="pizzicato" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="pizzicato-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
