import React from 'react';
import { bind } from '../../games/tuning-time.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function TuningTimeGame({ onFinish }) {
    return <LegacyGameView gameId="tuning-time" bindCanvasEngine={bind} onFinish={onFinish} />;
}
