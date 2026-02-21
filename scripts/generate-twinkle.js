const fs = require('fs');
const path = require('path');

// Metronome ticks every 0.75s (quarter note)
// Twinkle Twinkle
// A: A A E E F# F# E(2) | D D C# C# B B A(2)
// B: E E D D C# C# B(2) | E E D D C# C# B(2)
// A: A A E E F# F# E(2) | D D C# C# B B A(2)
const BEAT = 0.75;
const WIDTH = 56;

const twinkleA = [
    { p: 'A4', f: 'Finger 0', s: 'A string', b: '⬇️ bow', l: 1 },
    { p: 'A4', f: 'Finger 0', s: 'A string', b: '⬆️ bow', l: 1 },
    { p: 'E5', f: 'Finger 0', s: 'E string', b: '⬇️ bow', l: 1 },
    { p: 'E5', f: 'Finger 0', s: 'E string', b: '⬆️ bow', l: 1 },
    { p: 'F#5', f: 'Finger 1', s: 'E string', b: '⬇️ bow', l: 1 },
    { p: 'F#5', f: 'Finger 1', s: 'E string', b: '⬆️ bow', l: 1 },
    { p: 'E5', f: 'Finger 0', s: 'E string', b: '⬇️ bow', l: 2 },
    { p: 'D5', f: 'Finger 3', s: 'A string', b: '⬆️ bow', l: 1 },
    { p: 'D5', f: 'Finger 3', s: 'A string', b: '⬇️ bow', l: 1 },
    { p: 'C#5', f: 'Finger 2', s: 'A string', b: '⬆️ bow', l: 1 },
    { p: 'C#5', f: 'Finger 2', s: 'A string', b: '⬇️ bow', l: 1 },
    { p: 'B4', f: 'Finger 1', s: 'A string', b: '⬆️ bow', l: 1 },
    { p: 'B4', f: 'Finger 1', s: 'A string', b: '⬇️ bow', l: 1 },
    { p: 'A4', f: 'Finger 0', s: 'A string', b: '⬆️ bow', l: 2 },
];

const twinkleB = [
    { p: 'E5', f: 'Finger 0', s: 'E string', b: '⬇️ bow', l: 1 },
    { p: 'E5', f: 'Finger 0', s: 'E string', b: '⬆️ bow', l: 1 },
    { p: 'D5', f: 'Finger 3', s: 'A string', b: '⬇️ bow', l: 1 },
    { p: 'D5', f: 'Finger 3', s: 'A string', b: '⬆️ bow', l: 1 },
    { p: 'C#5', f: 'Finger 2', s: 'A string', b: '⬇️ bow', l: 1 },
    { p: 'C#5', f: 'Finger 2', s: 'A string', b: '⬆️ bow', l: 1 },
    { p: 'B4', f: 'Finger 1', s: 'A string', b: '⬇️ bow', l: 2 },
    { p: 'E5', f: 'Finger 0', s: 'E string', b: '⬆️ bow', l: 1 },
    { p: 'E5', f: 'Finger 0', s: 'E string', b: '⬇️ bow', l: 1 },
    { p: 'D5', f: 'Finger 3', s: 'A string', b: '⬆️ bow', l: 1 },
    { p: 'D5', f: 'Finger 3', s: 'A string', b: '⬇️ bow', l: 1 },
    { p: 'C#5', f: 'Finger 2', s: 'A string', b: '⬆️ bow', l: 1 },
    { p: 'C#5', f: 'Finger 2', s: 'A string', b: '⬇️ bow', l: 1 },
    { p: 'B4', f: 'Finger 1', s: 'A string', b: '⬆️ bow', l: 2 },
];

const twinkleFull = [...twinkleA, ...twinkleB, ...twinkleA];

let totalBeats = 0;
let html = '';

twinkleFull.forEach(n => {
    const start = (totalBeats * BEAT).toFixed(2);
    const duration = (n.l * BEAT).toFixed(2);
    const x = totalBeats * WIDTH;
    const w = n.l * WIDTH;

    html += `          <div class="song-note" style="--note-x:${x}px;--note-width:${w}px;--note-start:${start}s;--note-duration:${duration}s">
            <span class="song-note-pitch">${n.p}</span>
            <span class="song-note-meta">
              <span class="song-note-finger">${n.f}</span>
              <span class="song-note-string">${n.s}</span>
              <span class="song-note-bow">${n.b}</span>
            </span>
          </div>\n`;

    totalBeats += n.l;
});

const totalDuration = (totalBeats * BEAT).toFixed(2);
const totalWidth = totalBeats * WIDTH;

console.log(`--song-duration:${totalDuration}s;--song-width:${totalWidth}px;--beat-width:${WIDTH}px`);
fs.writeFileSync('/tmp/twinkle_extended.html', html);
console.log('Wrote to /tmp/twinkle_extended.html');
