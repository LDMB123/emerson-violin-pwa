import React from 'react';
import { bind } from '../../games/story-song.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function StorySongGame({ onFinish }) {
    return <LegacyGameView gameId="story-song" bindCanvasEngine={bind} onFinish={onFinish} />;
}
