import React from 'react';
import { bind } from '../../games/scale-practice.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function ScalePracticeGame({ onFinish }) {
    return <LegacyGameView gameId="scale-practice" bindCanvasEngine={bind} onFinish={onFinish} />;
}
