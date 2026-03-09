import React from 'react';
import { useParams } from 'react-router';
import { GameShell } from '../../components/shared/GameShell.jsx';
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

export function GameRunnerView({ propGameId, onExit }) {
    const params = useParams();
    const gameId = propGameId || params.gameId;

    const renderGameComponent = (id) => {
        switch (id) {
            case 'note-memory': return <div id="note-memory-canvas" style={{ width: '100%', height: '100%', touchAction: 'none' }} />;
            case 'bow-hero': return <BowHeroGame />;
            case 'dynamic-dojo': return <DynamicDojoGame />;
            case 'stir-soup': return <StirSoupGame />;
            case 'wipers': return <WipersGame />;
            case 'echo': return <EchoGame />;
            case 'pitch-quest': return <PitchQuestGame />;
            case 'ear-trainer': return <EarTrainerGame />;
            case 'tuning-time': return <TuningTimeGame />;
            case 'scale-practice': return <ScalePracticeGame />;
            case 'rhythm-dash': return <RhythmDashGame />;
            case 'rhythm-painter': return <RhythmPainterGame />;
            case 'pizzicato': return <PizzicatoGame />;
            case 'duet-challenge': return <DuetChallengeGame />;
            case 'story-song': return <StorySongGame />;
            case 'melody-maker': return <MelodyMakerGame />;
            case 'string-quest': return <StringQuestGame />;
            default: return <div style={{ color: 'var(--color-text)', padding: 20 }}>Game missing: {id}</div>;
        }
    };

    const title = gameId ? gameId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Game';

    return (
        <GameShell gameId={gameId} title={title} onExit={onExit}>
            {renderGameComponent(gameId)}
        </GameShell>
    );
}
