import React from 'react';
import { bind } from '../../games/note-memory.js';
import { LegacyGameView } from './LegacyGameView.jsx';

export function NoteMemoryGame({ onFinish }) {
    return (
        <LegacyGameView gameId="note-memory" bindCanvasEngine={bind} onFinish={onFinish} />
    );
}
