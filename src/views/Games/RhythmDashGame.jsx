import React from 'react';
import { bind } from '../../games/rhythm-dash.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function RhythmDashGame({ onFinish }) {
    return <LegacyGameView gameId="rhythm-dash" bindCanvasEngine={bind} onFinish={onFinish} />;
}
