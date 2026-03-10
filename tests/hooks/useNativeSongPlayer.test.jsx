import React, { useRef } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sharedMocks = vi.hoisted(() => ({
    playToneNote: vi.fn(),
}));

vi.mock('../../src/games/shared.js', () => sharedMocks);

import { useNativeSongPlayer } from '../../src/hooks/useNativeSongPlayer.js';

function NativeSongPlayerHarness({ isPlaying = false, onFinish, sheetMarkup = null }) {
    const containerRef = useRef(null);

    useNativeSongPlayer({
        containerRef,
        sheetMarkup,
        isPlaying,
        playMelody: true,
        metronome: false,
        onFinish,
    });

    if (!sheetMarkup) {
        return <div>Loading song...</div>;
    }

    return (
        <div ref={containerRef}>
            <div dangerouslySetInnerHTML={{ __html: sheetMarkup }} />
        </div>
    );
}

describe('useNativeSongPlayer', () => {
    let rafTimestamp = 0;

    beforeEach(() => {
        vi.useFakeTimers();
        rafTimestamp = 0;
        sharedMocks.playToneNote.mockClear();

        const requestAnimationFrameMock = vi.fn((callback) => setTimeout(() => {
            rafTimestamp += 16;
            callback(rafTimestamp);
        }, 16));
        const cancelAnimationFrameMock = vi.fn((id) => clearTimeout(id));

        vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock);
        vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('parses notes after async sheet markup mounts and finishes playback', async () => {
        const onFinish = vi.fn();
        const sheetMarkup = `
            <div class="song-sheet">
                <div class="song-playhead"></div>
                <div class="song-note" style="--note-start: 0s; --note-duration: 0.25s;">
                    <span class="song-note-pitch">A4</span>
                </div>
            </div>
        `;

        const { rerender } = render(
            <NativeSongPlayerHarness isPlaying={false} onFinish={onFinish} sheetMarkup={null} />,
        );

        await act(async () => {
            rerender(
                <NativeSongPlayerHarness
                    isPlaying={true}
                    onFinish={onFinish}
                    sheetMarkup={sheetMarkup}
                />,
            );
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(80);
        });

        expect(sharedMocks.playToneNote).toHaveBeenCalledWith(
            'A4',
            expect.objectContaining({ type: 'violin' }),
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2200);
        });

        expect(onFinish).toHaveBeenCalledTimes(1);
    });
});
