import React from 'react';
import { bind } from '../../games/duet-challenge.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function DuetChallengeGame({ onFinish }) {
    return <LegacyGameView gameId="duet-challenge" bindCanvasEngine={bind} onFinish={onFinish} />;
}
