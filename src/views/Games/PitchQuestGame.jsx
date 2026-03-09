import React from 'react';
import { LegacyGameView } from './LegacyGameView.jsx';
import { bind as bindPitchQuest } from '../../games/pitch-quest.js';

export function PitchQuestGame({ onFinish }) {
    return (
        <LegacyGameView gameId="pitch-quest" bindCanvasEngine={bindPitchQuest} onFinish={onFinish} />
    );
}
