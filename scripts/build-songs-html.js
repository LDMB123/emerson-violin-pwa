import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const songsPath = path.join(rootDir, 'src', 'data', 'songs.json');
const indexPath = path.join(rootDir, 'index.html');

const songs = JSON.parse(await fs.readFile(songsPath, 'utf8'));
if (!Array.isArray(songs)) {
    throw new Error('songs.json did not evaluate to an array');
}

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const indent = '          ';
const clampStars = (value) => Math.min(5, Math.max(1, Number(value) || 0));
const buildStars = (stars) => {
    const safeStars = clampStars(stars);
    return Array.from({ length: 5 }, (_, index) => {
        const filled = index < safeStars ? ' is-filled' : '';
        return `${indent}    <span class="star${filled}">★</span>`;
    }).join('\n');
};

const cards = songs.map((song) => {
    const id = escapeHtml(song.id);
    const title = escapeHtml(song.title);
    const level = escapeHtml(song.level);
    const art = escapeHtml(song.art || '🎻');
    const stars = clampStars(song.stars || (level === 'advanced' ? 5 : level === 'intermediate' ? 4 : 3));
    return [
        `${indent}<a class="song-card glass" href="#view-song-${id}" data-song="${id}" data-level="${level}">`,
        `${indent}  <div class="song-art">${art}</div>`,
        `${indent}  <div class="song-title">${title}</div>`,
        `${indent}  <div class="song-stars" aria-label="${stars} stars">`,
        buildStars(stars),
        `${indent}  </div>`,
        `${indent}  <div class="song-play" aria-hidden="true">▶</div>`,
        `${indent}</a>`,
    ].join('\n');
}).join('\n');

const levelLabels = {
    beginner: 'Level 1',
    intermediate: 'Level 2',
    advanced: 'Level 3',
};

const beatWidth = 56;
const viewIndent = '      ';
const viewInner = '        ';
const viewDeep = '          ';

const songViews = songs.map((song) => {
    const id = escapeHtml(song.id);
    const title = escapeHtml(song.title);
    const level = escapeHtml(song.level);
    const levelLabel = levelLabels[song.level] || song.level;
    const tempo = Number(song.tempo) || 60;
    const timeSig = Array.isArray(song.timeSignature) ? song.timeSignature.join('/') : '4/4';
    const totalBeats = song.notes.reduce((max, note) => Math.max(max, note.startBeat + note.duration), 0);
    const secondsPerBeat = 60 / tempo;
    const durationSeconds = totalBeats * secondsPerBeat;
    const songWidth = Math.max(320, Math.ceil(totalBeats * beatWidth));

    const notes = song.notes.map((note) => {
        const noteX = Math.round(note.startBeat * beatWidth);
        const noteWidth = Math.max(40, Math.round(note.duration * beatWidth));
        const noteStart = (note.startBeat * secondsPerBeat).toFixed(2);
        const noteDuration = (note.duration * secondsPerBeat).toFixed(2);
        const bowIcon = note.bowDirection === 'down' ? '⬇️' : note.bowDirection === 'up' ? '⬆️' : '';
        const finger = note.finger ? escapeHtml(note.finger) : '';
        const string = note.string ? escapeHtml(note.string) : '';
        const pitch = escapeHtml(note.pitch);
        return [
            `${viewDeep}<div class="song-note" style="--note-x:${noteX}px;--note-width:${noteWidth}px;--note-start:${noteStart}s;--note-duration:${noteDuration}s">`,
            `${viewDeep}  <span class="song-note-pitch">${pitch}</span>`,
            `${viewDeep}  <span class="song-note-meta">`,
            finger ? `${viewDeep}    <span class="song-note-finger">Finger ${finger}</span>` : '',
            string ? `${viewDeep}    <span class="song-note-string">${string} string</span>` : '',
            bowIcon ? `${viewDeep}    <span class="song-note-bow">${bowIcon} bow</span>` : '',
            `${viewDeep}  </span>`,
            `${viewDeep}</div>`,
        ].filter(Boolean).join('\n');
    }).join('\n');

    const tips = (song.tips || []).map((tip) => `${viewDeep}<li>${escapeHtml(tip)}</li>`).join('\n');

    return [
        `${viewIndent}<section class="view song-view" id="view-song-${id}" aria-label="Song: ${title}">`,
        `${viewInner}<input type="checkbox" id="song-play-${id}" class="song-play-toggle" />`,
        `${viewInner}<div class="view-header">`,
        `${viewInner}  <a href="#view-songs" class="back-btn">← Back</a>`,
        `${viewInner}  <h2>${title}</h2>`,
        `${viewInner}  <span class="song-level-pill">${escapeHtml(levelLabel)}</span>`,
        `${viewInner}</div>`,
        `${viewInner}<div class="song-meta glass">`,
        `${viewInner}  <div><span class="song-meta-label">Tempo</span><strong>${tempo} BPM</strong></div>`,
        `${viewInner}  <div><span class="song-meta-label">Time</span><strong>${escapeHtml(timeSig)}</strong></div>`,
        `${viewInner}</div>`,
        `${viewInner}<div class="song-controls">`,
        `${viewInner}  <label for="song-play-${id}" class="btn btn-primary btn-start">▶️ Playhead</label>`,
        `${viewInner}  <label for="song-play-${id}" class="btn btn-secondary btn-stop">⏹ Stop</label>`,
        `${viewInner}  <a class="btn btn-ghost" href="#view-songs">Library</a>`,
        `${viewInner}</div>`,
        `${viewInner}<div class="song-sheet glass" aria-hidden="true" style="--song-duration:${durationSeconds.toFixed(2)}s;--song-width:${songWidth}px;--beat-width:${beatWidth}px">`,
        `${viewInner}  <div class="song-staff" role="list" aria-label="Notes">`,
        `${viewInner}    <div class="song-playhead" aria-hidden="true"></div>`,
        notes,
        `${viewInner}  </div>`,
        `${viewInner}</div>`,
        `${viewInner}<details class="song-tips glass">`,
        `${viewInner}  <summary>Practice Tips</summary>`,
        `${viewInner}  <ul>`,
        tips,
        `${viewInner}  </ul>`,
        `${viewInner}</details>`,
        `${viewIndent}</section>`,
    ].join('\n');
}).join('\n\n');

const start = '<!-- SONGS_GRID_START -->';
const end = '<!-- SONGS_GRID_END -->';
const viewsStart = '<!-- SONG_VIEWS_START -->';
const viewsEnd = '<!-- SONG_VIEWS_END -->';
const html = await fs.readFile(indexPath, 'utf8');
const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
const viewsPattern = new RegExp(`${viewsStart}[\\s\\S]*?${viewsEnd}`);

if (!pattern.test(html) || !viewsPattern.test(html)) {
    console.log('[build-songs-html] Markers not found, skipping.');
    process.exit(0);
}

const nextHtml = html
    .replace(pattern, `${start}\n${cards}\n${indent}${end}`)
    .replace(viewsPattern, `${viewsStart}\n${songViews}\n${viewIndent}${viewsEnd}`);
await fs.writeFile(indexPath, nextHtml);
