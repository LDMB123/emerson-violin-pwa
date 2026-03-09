import React from 'react';
import { bind } from '../../games/pizzicato.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function PizzicatoGame({ onFinish }) {
    return <LegacyGameView gameId="pizzicato" bindCanvasEngine={bind} onFinish={onFinish} />;
}
