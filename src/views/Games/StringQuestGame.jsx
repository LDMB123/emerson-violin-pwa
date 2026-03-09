import React from 'react';
import { bind } from '../../games/string-quest.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function StringQuestGame({ onFinish }) {
    return <LegacyGameView gameId="string-quest" bindCanvasEngine={bind} onFinish={onFinish} />;
}
