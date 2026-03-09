import React from 'react';
import { CanvasGameRunner } from './CanvasGameRunner.jsx';
import { init as initDynamicDojo } from '../../games/dynamic-dojo.js';

export function DynamicDojoGame() {
    // Note: Dynamic Dojo exported init() instead of bind() explicitly taking a container, 
    // but the runtime logic queries by data attributes within `#view-game-dynamic-dojo`
    // which our GameRunner will provide via the `gameId` wrapper.

    // We create a mock bind that just calls init since init uses document.getElementById internal.
    const bindAdapter = () => {
        initDynamicDojo();
    };

    return (
        <CanvasGameRunner gameId="dynamic-dojo" bindCanvasEngine={bindAdapter}>
            <div data-dojo="prompt" style={{ position: 'absolute', top: '10%', width: '100%', textAlign: 'center', color: 'white', fontSize: '2rem', zIndex: 10 }}>
                Loading Dojo...
            </div>

            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <button data-dojo="listen" style={{ padding: '20px 40px', fontSize: '2rem', zIndex: 20 }}>Listen</button>
                <div data-dojo="board" className="dojo-hidden dojo-board" style={{ fontSize: '10rem', opacity: 0 }}>🥋</div>
                <div data-dojo="tiger" className="dojo-hidden dojo-tiger" style={{ fontSize: '10rem', opacity: 0 }}>🐯</div>
            </div>

            <div style={{ position: 'absolute', right: 20, bottom: 20, width: 40, height: 200, background: '#333' }}>
                <div data-dojo="volume-fill" style={{ width: '100%', height: '0%', background: 'green', transition: 'height 0.1s linear', position: 'absolute', bottom: 0 }}></div>
            </div>
        </CanvasGameRunner>
    );
}
