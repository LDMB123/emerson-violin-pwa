import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { bind } from '../../games/story-song.js';

export function StorySongGame({ onFinish }) {
    return (
        <CanvasGameRunner gameId="story-song" bindCanvasEngine={bind} onFinish={onFinish}>
            <canvas id="story-song-canvas" style={{ width: '100%', height: '100%', display: 'block' }}></canvas>
        </CanvasGameRunner>
    );
}
