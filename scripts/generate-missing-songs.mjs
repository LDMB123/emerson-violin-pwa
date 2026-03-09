import fs from 'fs';
import path from 'path';

const catalogPath = path.resolve('public/content/songs/catalog.v2.json');
const viewsDir = path.resolve('public/views/songs');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const existingFiles = new Set(fs.readdirSync(viewsDir));

const NOTES = [
    { p: 'A4', f: 'Finger 0', s: 'A string' },
    { p: 'B4', f: 'Finger 1', s: 'A string' },
    { p: 'C#5', f: 'Finger 2', s: 'A string' },
    { p: 'D5', f: 'Finger 3', s: 'A string' },
    { p: 'E5', f: 'Finger 0', s: 'E string' },
    { p: 'F#5', f: 'Finger 1', s: 'E string' },
    { p: 'G#5', f: 'Finger 2', s: 'E string' },
    { p: 'A5', f: 'Finger 3', s: 'E string' }
];

const BOWS = ['⬇️ bow', '⬆️ bow'];
const WIDTH = 56;

let generatedCount = 0;

const createSeededRandom = (seedSource) => {
    let seed = 0;
    for (const char of seedSource) {
        seed = ((seed * 31) + char.charCodeAt(0)) >>> 0;
    }

    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
};

for (const song of catalog.songs) {
    const filename = `${song.id}.html`;
    if (existingFiles.has(filename)) {
        continue;
    }

    // Typical song beat calculation
    const BEAT = 60 / (song.bpm || 80);
    // Determine # of measures roughly from time signature
    const timeNum = parseInt((song.time || '4/4').split('/')[0], 10);
    // Give it at least 8 measures
    const totalBeats = timeNum * 16;

    const totalDuration = totalBeats * BEAT;
    const totalWidth = totalBeats * WIDTH;
    const random = createSeededRandom(`${song.id}:${song.bpm}:${song.time}`);

    let notesHtml = '';
    let currentBeat = 0;

    while (currentBeat < totalBeats) {
        const remaining = totalBeats - currentBeat;
        const possibleLengths = [1, 1, 1, 2, 2, 4].filter(l => l <= remaining);
        const l = possibleLengths[Math.floor(random() * possibleLengths.length)];

        const note = NOTES[Math.floor(random() * NOTES.length)];
        const bow = BOWS[Math.floor(random() * BOWS.length)];

        const start = currentBeat * BEAT;
        const duration = l * BEAT;
        const x = currentBeat * WIDTH;
        const w = l * WIDTH;

        notesHtml += `          <div class="song-note" style="--note-x:${x.toFixed(0)}px;--note-width:${w.toFixed(0)}px;--note-start:${start.toFixed(2)}s;--note-duration:${duration.toFixed(2)}s">
            <span class="song-note-pitch">${note.p}</span>
            <span class="song-note-meta">
              <span class="song-note-finger">${note.f}</span>
              <span class="song-note-string">${note.s}</span>
              <span class="song-note-bow">${bow}</span>
            </span>
          </div>\n`;

        currentBeat += l;
    }

    const html = `<section class="view song-view" id="view-song-${song.id}" aria-label="Song: ${song.title}">
        <input type="checkbox" id="song-play-${song.id}" class="song-play-toggle">
        <div class="view-header">
          <a href="#view-songs" class="back-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>Back</a>
          <h2>${song.title}</h2>
          <span class="song-level-pill">${song.tier === 'beginner' ? 'Level 1' : song.tier === 'intermediate' ? 'Level 2' : 'Challenge'}</span>
        </div>
        <div class="song-meta glass">
          <div><span class="song-meta-label">Tempo</span><strong>${song.bpm} BPM</strong></div>
          <div><span class="song-meta-label">Time</span><strong>${song.time}</strong></div>
        </div>
        <div class="song-controls">
          <label for="song-play-${song.id}" class="btn btn-primary btn-start">▶️ Playhead</label>
          <label for="song-play-${song.id}" class="btn btn-secondary btn-stop">⏹ Stop</label>
          <a class="btn btn-ghost" href="#view-songs">Library</a>
        </div>
        <div class="song-sheet glass" aria-hidden="true" style="--song-duration:${totalDuration.toFixed(2)}s;--song-width:${totalWidth.toFixed(0)}px;--beat-width:56px">
          <div class="song-staff" role="list" aria-label="Notes">
            <div class="song-playhead" aria-hidden="true"></div>
${notesHtml.trimEnd()}
          </div>
        </div>
</section>`;

    fs.writeFileSync(path.join(viewsDir, filename), html);
    generatedCount++;
    console.log(`Generated HTML for: ${song.id} (${totalDuration.toFixed(1)}s, ${totalBeats} beats)`);
}

console.log(`\nSuccess! Generated ${generatedCount} missing song views.`);
