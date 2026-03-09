import React from 'react';
import { bind } from '../../games/melody-maker.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function MelodyMakerGame({ onFinish }) {
    return <LegacyGameView gameId="melody-maker" bindCanvasEngine={bind} onFinish={onFinish} />;
}
