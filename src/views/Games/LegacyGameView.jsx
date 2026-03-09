import React, { useEffect, useState } from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';

const extractLegacyMarkup = (rawHtml, gameId) => {
    if (typeof DOMParser === 'undefined') {
        return rawHtml;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const section = doc.querySelector(`#view-game-${gameId}`) || doc.querySelector('section');
    if (!section) return rawHtml;

    return section.innerHTML;
};

export function LegacyGameView({ gameId, bindCanvasEngine, onFinish }) {
    const [markup, setMarkup] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadMarkup = async () => {
            try {
                const response = await fetch(`./views/games/${gameId}.html`);
                if (!response.ok) throw new Error(`Legacy markup missing for ${gameId}`);
                const rawHtml = await response.text();
                if (mounted) {
                    setMarkup(extractLegacyMarkup(rawHtml, gameId));
                }
            } catch (error) {
                console.error(`[LegacyGameView] Failed to load ${gameId}`, error);
                if (mounted) {
                    setMarkup('<div style="color: white; padding: 24px;">Game UI failed to load.</div>');
                }
            }
        };

        loadMarkup();
        return () => {
            mounted = false;
        };
    }, [gameId]);

    return (
        <CanvasGameRunner
            gameId={gameId}
            bindCanvasEngine={markup ? bindCanvasEngine : null}
            onFinish={onFinish}
            readyKey={markup ? `ready:${gameId}` : `loading:${gameId}`}
        >
            {markup ? (
                <div dangerouslySetInnerHTML={{ __html: markup }} />
            ) : (
                <div style={{ color: 'white', padding: 24 }}>Loading game...</div>
            )}
        </CanvasGameRunner>
    );
}
