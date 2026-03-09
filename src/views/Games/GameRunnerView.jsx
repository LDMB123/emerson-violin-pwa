import React from 'react';
import { useParams } from 'react-router';
import { GameShell } from '../../components/shared/GameShell.jsx';
import { NoteMemoryGame } from './NoteMemoryGame.jsx';
import { BowHeroGame } from './BowHeroGame.jsx';
import { DynamicDojoGame } from './DynamicDojoGame.jsx';
import { StirSoupGame } from './StirSoupGame.jsx';
import { WipersGame } from './WipersGame.jsx';
import { EchoGame } from './EchoGame.jsx';
import { PitchQuestGame } from './PitchQuestGame.jsx';
import { EarTrainerGame } from './EarTrainerGame.jsx';
import { TuningTimeGame } from './TuningTimeGame.jsx';
import { ScalePracticeGame } from './ScalePracticeGame.jsx';
import { RhythmDashGame } from './RhythmDashGame.jsx';
import { RhythmPainterGame } from './RhythmPainterGame.jsx';
import { PizzicatoGame } from './PizzicatoGame.jsx';
import { DuetChallengeGame } from './DuetChallengeGame.jsx';
import { StorySongGame } from './StorySongGame.jsx';
import { MelodyMakerGame } from './MelodyMakerGame.jsx';
import { StringQuestGame } from './StringQuestGame.jsx';
import { SUPPORTED_GAME_IDS } from '../../games/game-runner-contract.js';

export function GameRunnerView({ propGameId, onExit }) {
    const params = useParams();
    const gameId = propGameId || params.gameId;

    const GAME_COMPONENTS = {
        'note-memory': <NoteMemoryGame />,
        'bow-hero': <BowHeroGame />,
        'dynamic-dojo': <DynamicDojoGame />,
        'stir-soup': <StirSoupGame />,
        wipers: <WipersGame />,
        echo: <EchoGame />,
        'pitch-quest': <PitchQuestGame />,
        'ear-trainer': <EarTrainerGame />,
        'tuning-time': <TuningTimeGame />,
        'scale-practice': <ScalePracticeGame />,
        'rhythm-dash': <RhythmDashGame />,
        'rhythm-painter': <RhythmPainterGame />,
        pizzicato: <PizzicatoGame />,
        'duet-challenge': <DuetChallengeGame />,
        'story-song': <StorySongGame />,
        'melody-maker': <MelodyMakerGame />,
        'string-quest': <StringQuestGame />,
    };

    const renderGameComponent = (id) => (
        GAME_COMPONENTS[id]
        || <div style={{ color: 'var(--color-text)', padding: 20 }}>Game missing: {id}</div>
    );

    const title = gameId ? gameId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Game';
    const supportedGameId = SUPPORTED_GAME_IDS.includes(gameId) ? gameId : null;

    return (
        supportedGameId ? (
            <GameShell gameId={supportedGameId} title={title} onExit={onExit}>
                {renderGameComponent(supportedGameId)}
            </GameShell>
        ) : (
            <section className="view is-active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ color: 'var(--color-text)', padding: 20 }}>Game missing: {gameId}</div>
            </section>
        )
    );
}
