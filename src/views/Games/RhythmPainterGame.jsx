import React from 'react';
import { bind } from '../../games/rhythm-painter.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function RhythmPainterGame({ onFinish }) {
    return <LegacyGameView gameId="rhythm-painter" bindCanvasEngine={bind} onFinish={onFinish} />;
}
