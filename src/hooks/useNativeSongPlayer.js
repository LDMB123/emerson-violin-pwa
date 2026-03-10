import { useEffect, useRef } from 'react';
import { playToneNote } from '../games/shared.js';

const PLAYHEAD_AUTOSCROLL_INTERVAL_MS = 80;

export function useNativeSongPlayer({
    containerRef,
    sheetMarkup = null,
    isPlaying,
    tempoScale = 1,
    playMelody = true,
    metronome = true,
    onFinish,
    songStartBeat = 4,
    sectionStart = 0,
    sectionEnd = null
}) {
    const audioTriggersRef = useRef(new Set());
    const animationRef = useRef(null);
    const notesRef = useRef([]);
    // Initialize notes array by traversing DOM in containerRef
    useEffect(() => {
        if (!containerRef.current) {
            notesRef.current = [];
            return;
        }
        const noteEls = Array.from(containerRef.current.querySelectorAll('.song-note'));
        notesRef.current = noteEls.map(el => {
            const style = el.getAttribute('style') || '';
            const startMatch = style.match(/--note-start:\s*([\d.]+)s/);
            const durMatch = style.match(/--note-duration:\s*([\d.]+)s/);
            const pitchEl = el.querySelector('.song-note-pitch');
            return {
                el,
                pitch: pitchEl ? pitchEl.textContent.trim() : null,
                start: startMatch ? Number.parseFloat(startMatch[1]) : 0,
                duration: durMatch ? Number.parseFloat(durMatch[1]) : 0
            };
        }).sort((a, b) => a.start - b.start);
    }, [containerRef.current, sheetMarkup]);

    // Cleanup RAF
    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    // Playback RAF
    useEffect(() => {
        let lastTime = 0;
        let elapsed = 0;
        let lastMetronomeBeat = -1;
        let lastAutoScrollAt = 0;

        const updateLoop = (now) => {
            if (!lastTime) lastTime = now;
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            elapsed += (delta * tempoScale);

            const sheet = containerRef.current?.querySelector('.song-sheet');
            const playhead = containerRef.current?.querySelector('.song-playhead');

            if (sheet) {
                // Update CSS variable for layout-driven CSS animation pause state equivalent natively
                sheet.style.setProperty('--song-playhead-paused-time', `${elapsed}s`);
            }

            // Metronome
            if (metronome) {
                // Approximate 80 bpm as default -> beat interval 0.75s
                const beatInterval = 60 / (80 * tempoScale);
                const currentBeat = Math.floor(elapsed / beatInterval);
                if (currentBeat > lastMetronomeBeat) {
                    lastMetronomeBeat = currentBeat;
                    const isDownbeat = currentBeat % songStartBeat === 0;
                    playToneNote(isDownbeat ? 'C6' : 'G5', { duration: 0.05, volume: isDownbeat ? 0.3 : 0.15, type: 'square' });
                }
            }

            // Play Melody
            if (playMelody) {
                const activeNotes = notesRef.current.filter(n => elapsed >= n.start && elapsed <= n.start + n.duration);
                activeNotes.forEach(n => {
                    if (!audioTriggersRef.current.has(n.el) && n.pitch && n.pitch !== 'REST') {
                        audioTriggersRef.current.add(n.el);
                        playToneNote(n.pitch, { duration: n.duration / tempoScale, volume: 0.4, type: 'violin' });
                    }
                });
            }

            // Scrolling logic
            if (now - lastAutoScrollAt > PLAYHEAD_AUTOSCROLL_INTERVAL_MS && sheet && playhead) {
                lastAutoScrollAt = now;
                const pRect = playhead.getBoundingClientRect();
                const sRect = sheet.getBoundingClientRect();
                const relativeX = pRect.left - sRect.left + sheet.scrollLeft;
                const viewWidth = sheet.clientWidth;
                if (viewWidth > 0 && relativeX > viewWidth * 0.5) {
                    sheet.scrollLeft = relativeX - (viewWidth * 0.5);
                }
            }

            // End of song roughly finding max duration
            const activeSectionEnd = sectionEnd || (notesRef.current.length > 0 ? (notesRef.current[notesRef.current.length - 1].start + 2) : 0);
            if (activeSectionEnd > 0 && elapsed >= activeSectionEnd) {
                if (sectionEnd) {
                    // Loop back to start
                    elapsed = sectionStart || 0;
                    audioTriggersRef.current.clear();
                } else {
                    if (onFinish) onFinish();
                    return;
                }
            }

            animationRef.current = requestAnimationFrame(updateLoop);
        };

        if (isPlaying) {
            audioTriggersRef.current.clear();
            elapsed = sectionStart || 0;
            lastTime = performance.now();
            animationRef.current = requestAnimationFrame(updateLoop);
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }

    }, [isPlaying, tempoScale, playMelody, metronome, onFinish, containerRef, sectionStart, sectionEnd]);

}
