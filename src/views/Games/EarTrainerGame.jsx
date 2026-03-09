import React from 'react';
import { bind } from '../../games/ear-trainer.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function EarTrainerGame({ onFinish }) {
    return <LegacyGameView gameId="ear-trainer" bindCanvasEngine={bind} onFinish={onFinish} />;
}
