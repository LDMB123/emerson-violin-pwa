const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const toastEl = $("#toast");
const tips = [
  "Keep your bow hand relaxed like holding a bubble.",
  "Imagine your bow painting a rainbow across the string.",
  "Slow practice builds superhero fingers.",
  "Breathe in before a tricky part, breathe out as you play.",
  "Let your left hand be light—no squishing the string.",
  "Aim for a straight bow path, like a train on tracks.",
  "Tiny pauses make big improvements. Celebrate each one!",
];

let voiceEnabled = false;
let audioCtx;
let tunerStream;
let tunerAnalyser;
let tunerAnimation;
let currentTarget = "A4";
let tunerHistory = [];
let coachAccuracySamples = [];
let reminderTime = "";
let lastReminderDay = "";
let tunerActive = false;
let pitchGameActive = false;
let pitchGameSamples = [];
let pitchGameTimer;
let pitchGameAutoStop = false;
let rhythmDashActive = false;
let rhythmDashInterval;
let rhythmDashStartTime = 0;
let rhythmDashTempo = 96;
let rhythmDashScore = 0;
let rhythmDashHits = 0;
let memorySequence = [];
let memoryInput = [];
let memoryScore = 0;
let memoryPlaying = false;
let bowTimerId;
let bowStart = 0;
let bowBest = 0;
let practiceTimerId;
let practiceTimerRunning = false;
let practiceTimerElapsed = 0;
let practiceTimerStart = 0;
let questState = { date: "", items: [], checks: [] };
let wakeLock = null;
let earTarget = null;
let earScore = 0;
let earRound = 0;
let patternSequence = [];
let patternIndex = 0;
let patternScore = 0;
let patternStartTime = 0;
let toneHistory = [];
let lastToneUpdate = 0;
let liveMetrics = { stability: null, warmth: null, dynamics: null, vibrato: null };
let adaptiveCoachEnabled = true;
let gameFocus = "auto";
let earDifficulty = 2;
let patternLength = 4;
let songState = {
  selectedId: null,
  tempo: 84,
  guide: true,
  click: true,
  drone: false,
  loop: false,
  playing: false,
  previewing: false,
};
let songPlaybackNodes = [];
let songPlaybackTimeout;
let songPlaybackStart = 0;
let songHighlightTimer;
let songPlaybackSequence = [];
let songPlaybackTotalBeats = 0;
let songPracticeStart = 0;
let favoriteSongIds = new Set();
let songTimeline = [];
let songProgressStart = 0;
let songProgressDuration = 0;
let songCountInDuration = 0;
let songCountInBeats = 0;

const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_OFFSETS = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};
const violinTargets = {
  G3: 196.0,
  D4: 293.66,
  A4: 440.0,
  E5: 659.25,
};

const QUEST_POOL = [
  "Warm up with open strings (2 min)",
  "Bowing rainbows on A string (3 min)",
  "Rhythm game: Panda Pizzicato (3 min)",
  "Song of the day (5 min)",
  "Left-hand spider taps (2 min)",
  "String crossings G-D-A-E (2 min)",
  "Long tone breathing (1 min)",
  "Rhythm Dash taps (2 min)",
  "Pitch Quest accuracy (3 min)",
  "Play along with a new song (4 min)",
  "Slow practice: favorite song (4 min)",
  "Ear Trainer challenge (3 min)",
  "Tone Lab long bows (2 min)",
];

const SONG_LIBRARY = [
  {
    id: "twinkle",
    title: "Twinkle Twinkle Little Star",
    level: "beginner",
    bpm: 84,
    key: "A major",
    strings: ["A", "E"],
    focus: "Open strings + first/second finger",
    notes: [
      ["A4", 1], ["A4", 1], ["E5", 1], ["E5", 1], ["F#5", 1], ["F#5", 1], ["E5", 2],
      ["D5", 1], ["D5", 1], ["C#5", 1], ["C#5", 1], ["B4", 1], ["B4", 1], ["A4", 2],
      ["E5", 1], ["E5", 1], ["D5", 1], ["D5", 1], ["C#5", 1], ["C#5", 1], ["B4", 2],
      ["E5", 1], ["E5", 1], ["D5", 1], ["D5", 1], ["C#5", 1], ["C#5", 1], ["B4", 2],
      ["A4", 1], ["A4", 1], ["E5", 1], ["E5", 1], ["F#5", 1], ["F#5", 1], ["E5", 2],
      ["D5", 1], ["D5", 1], ["C#5", 1], ["C#5", 1], ["B4", 1], ["B4", 1], ["A4", 2],
    ],
    tips: ["Keep bow slow on long notes.", "Listen for a bright, ringing E string."],
  },
  {
    id: "mary",
    title: "Mary Had a Little Lamb",
    level: "beginner",
    bpm: 90,
    key: "D major",
    strings: ["A", "E"],
    focus: "Step-wise fingers, gentle bow changes",
    notes: [
      ["E5", 1], ["D5", 1], ["C#5", 1], ["D5", 1], ["E5", 1], ["E5", 1], ["E5", 2],
      ["D5", 1], ["D5", 1], ["D5", 2], ["E5", 1], ["G5", 1], ["G5", 2],
      ["E5", 1], ["D5", 1], ["C#5", 1], ["D5", 1], ["E5", 1], ["E5", 1], ["E5", 1], ["E5", 1],
      ["D5", 1], ["D5", 1], ["E5", 1], ["D5", 1], ["C#5", 2],
    ],
    tips: ["Use tiny finger taps for C#.", "Keep the bow in the middle lane."],
  },
  {
    id: "hot-cross-buns",
    title: "Hot Cross Buns",
    level: "beginner",
    bpm: 96,
    key: "D major",
    strings: ["A"],
    focus: "Two-finger patterns, steady bow",
    notes: [
      ["E5", 1], ["D5", 1], ["C#5", 2],
      ["E5", 1], ["D5", 1], ["C#5", 2],
      ["C#5", 0.5], ["C#5", 0.5], ["C#5", 0.5], ["C#5", 0.5],
      ["D5", 0.5], ["D5", 0.5], ["D5", 0.5], ["D5", 0.5],
      ["E5", 1], ["D5", 1], ["C#5", 2],
    ],
    tips: ["Keep fingers curved like a bridge.", "Aim for even rhythm on repeated notes."],
  },
  {
    id: "lightly-row",
    title: "Lightly Row",
    level: "early",
    bpm: 92,
    key: "A major",
    strings: ["A", "E"],
    focus: "String crossings, easy slurs",
    notes: [
      ["E5", 1], ["E5", 1], ["F#5", 1], ["G5", 1], ["G5", 1], ["F#5", 1], ["E5", 1], ["D5", 1],
      ["C#5", 1], ["D5", 1], ["E5", 1], ["E5", 1], ["D5", 1], ["D5", 2],
    ],
    tips: ["Use a tiny wrist wave for crossings.", "Listen for smooth bow changes."],
  },
  {
    id: "ode-to-joy",
    title: "Ode to Joy (Theme)",
    level: "early",
    bpm: 88,
    key: "D major",
    strings: ["A", "E"],
    focus: "Even bowing, steady tempo",
    notes: [
      ["E5", 1], ["E5", 1], ["F#5", 1], ["G5", 1], ["G5", 1], ["F#5", 1], ["E5", 1], ["D5", 1],
      ["C#5", 1], ["C#5", 1], ["D5", 1], ["E5", 1], ["E5", 1], ["D5", 1], ["D5", 2],
    ],
    tips: ["Breathe before the phrase starts.", "Keep the bow parallel to the bridge."],
  },
  {
    id: "jingle-bells",
    title: "Jingle Bells (Refrain)",
    level: "early",
    bpm: 100,
    key: "A major",
    strings: ["A", "E"],
    focus: "Quick notes and light bow",
    notes: [
      ["E5", 1], ["E5", 1], ["E5", 2],
      ["E5", 1], ["E5", 1], ["E5", 2],
      ["E5", 1], ["G5", 1], ["C#5", 1], ["D5", 1], ["E5", 2],
      ["F#5", 1], ["F#5", 1], ["F#5", 1], ["F#5", 1], ["F#5", 1],
      ["E5", 1], ["E5", 1], ["E5", 1], ["E5", 1], ["E5", 1],
      ["D5", 1], ["D5", 1], ["E5", 1], ["D5", 2], ["G5", 2],
    ],
    tips: ["Use a springy bow for repeated notes.", "Keep fingers close to the string."],
  },
  {
    id: "open-strings",
    title: "Open String Parade",
    level: "beginner",
    bpm: 80,
    key: "D major",
    strings: ["G", "D", "A", "E"],
    focus: "Beautiful open strings, straight bow",
    notes: [
      ["G3", 2], ["D4", 2], ["A4", 2], ["E5", 2],
      ["E5", 2], ["A4", 2], ["D4", 2], ["G3", 2],
    ],
    tips: ["Bow lane check: middle between bridge and fingerboard.", "Relax shoulders and breathe."],
  },
  {
    id: "panda-lullaby",
    title: "Panda Lullaby",
    level: "early",
    bpm: 72,
    key: "G major",
    strings: ["G", "D"],
    focus: "Warm tone, slow bows",
    notes: [
      ["G3", 2], ["D4", 2], ["E4", 2], ["D4", 2],
      ["G3", 2], ["D4", 2], ["C4", 2], ["D4", 2],
    ],
    tips: ["Use long bows for a warm sound.", "Keep fingers soft and curved."],
  },
  {
    id: "merrily",
    title: "Merrily We Roll Along",
    level: "beginner",
    bpm: 96,
    key: "A major",
    strings: ["A", "E"],
    focus: "Light fingers + even rhythm",
    notes: [
      ["E5", 1], ["D5", 1], ["C#5", 1], ["D5", 1], ["E5", 1], ["E5", 1], ["E5", 2],
      ["D5", 1], ["D5", 1], ["D5", 2], ["E5", 1], ["A5", 1], ["A5", 2],
    ],
    tips: ["Keep fingers close to the string.", "Bow changes should be smooth."],
  },
  {
    id: "aunt-rhody",
    title: "Go Tell Aunt Rhody",
    level: "early",
    bpm: 84,
    key: "D major",
    strings: ["A", "E"],
    focus: "Stepwise motion, gentle bow",
    notes: [
      ["D5", 1], ["D5", 1], ["E5", 1], ["F#5", 1], ["F#5", 1], ["E5", 1], ["D5", 1], ["E5", 1],
      ["F#5", 1], ["F#5", 1], ["E5", 1], ["D5", 2],
    ],
    tips: ["Listen for clean finger taps.", "Keep the bow in the center lane."],
  },
  {
    id: "old-macdonald",
    title: "Old MacDonald",
    level: "early",
    bpm: 92,
    key: "A major",
    strings: ["A", "E"],
    focus: "String crossings and rhythm",
    notes: [
      ["A4", 1], ["A4", 1], ["A4", 1], ["E5", 1], ["F#5", 1], ["F#5", 1], ["E5", 2],
      ["D5", 1], ["D5", 1], ["C#5", 1], ["C#5", 1], ["B4", 1], ["B4", 1], ["A4", 2],
    ],
    tips: ["Keep the bow straight on string crossings.", "Count the steady beat."],
  },
  {
    id: "au-clair",
    title: "Au Clair de la Lune",
    level: "early",
    bpm: 76,
    key: "A major",
    strings: ["A", "E"],
    focus: "Smooth bow, lyrical sound",
    notes: [
      ["A4", 1], ["A4", 1], ["A4", 1], ["B4", 1], ["C#5", 2], ["B4", 2],
      ["A4", 1], ["A4", 1], ["A4", 1], ["B4", 1], ["C#5", 2], ["B4", 2],
      ["A4", 2], ["B4", 2], ["C#5", 2], ["D5", 2],
    ],
    tips: ["Use long bows and breathe with the phrase.", "Listen for a calm tone."],
  },
  {
    id: "scale-ladder",
    title: "A Major Scale Ladder",
    level: "early",
    bpm: 80,
    key: "A major",
    strings: ["A", "E"],
    focus: "Clear fingers and steady tempo",
    notes: [
      ["A4", 1], ["B4", 1], ["C#5", 1], ["D5", 1], ["E5", 1], ["F#5", 1], ["G#5", 1], ["A5", 2],
      ["A5", 1], ["G#5", 1], ["F#5", 1], ["E5", 1], ["D5", 1], ["C#5", 1], ["B4", 1], ["A4", 2],
    ],
    tips: ["Keep fingers curved and relaxed.", "Use slow, even bows."],
  },
  {
    id: "panda-waltz",
    title: "Panda Waltz",
    level: "early",
    bpm: 90,
    key: "G major",
    strings: ["G", "D"],
    focus: "3-beat feel and bow control",
    notes: [
      ["G3", 1], ["D4", 1], ["G4", 1], ["G4", 1], ["D4", 1], ["G3", 1],
      ["G3", 1], ["D4", 1], ["E4", 1], ["E4", 1], ["D4", 1], ["G3", 1],
    ],
    tips: ["Count 1-2-3 in each bar.", "Make the first beat a little stronger."],
  },
  {
    id: "rainbow-arpeggio",
    title: "Rainbow Arpeggio",
    level: "early",
    bpm: 88,
    key: "A major",
    strings: ["A", "E"],
    focus: "Arpeggio shape + intonation",
    notes: [
      ["A4", 1], ["C#5", 1], ["E5", 1], ["A5", 2],
      ["A5", 1], ["E5", 1], ["C#5", 1], ["A4", 2],
    ],
    tips: ["Listen for sparkling top notes.", "Keep the bow steady on string changes."],
  },
  {
    id: "happy-birthday",
    title: "Happy Birthday",
    level: "early",
    bpm: 88,
    key: "D major",
    strings: ["A", "E"],
    focus: "Phrase shaping and gentle bow",
    notes: [
      ["D5", 1], ["D5", 1], ["E5", 2], ["D5", 2], ["G5", 2], ["F#5", 4],
      ["D5", 1], ["D5", 1], ["E5", 2], ["D5", 2], ["A5", 2], ["G5", 4],
      ["D5", 1], ["D5", 1], ["D5", 2], ["B4", 2], ["G5", 2], ["F#5", 2], ["E5", 4],
      ["C#5", 1], ["C#5", 1], ["B4", 2], ["G5", 2], ["A5", 2], ["G5", 4],
    ],
    tips: ["Sing the phrase first, then play.", "Use a long bow on the final note."],
  },
  {
    id: "row-row",
    title: "Row Row Row Your Boat",
    level: "beginner",
    bpm: 92,
    key: "D major",
    strings: ["D", "A"],
    focus: "Even rhythm and legato",
    notes: [
      ["D4", 1], ["D4", 1], ["D4", 2], ["E4", 1], ["F#4", 1], ["F#4", 2],
      ["E4", 1], ["F#4", 1], ["G4", 2], ["A4", 2],
      ["A4", 1], ["A4", 1], ["A4", 2], ["F#4", 2], ["D4", 2],
      ["A4", 1], ["A4", 1], ["F#4", 2], ["D4", 4],
    ],
    tips: ["Keep the bow smooth like water.", "Listen for even rhythm."],
  },
  {
    id: "frere-jacques",
    title: "Frere Jacques",
    level: "beginner",
    bpm: 84,
    key: "D major",
    strings: ["D", "A"],
    focus: "Repeat patterns and steady bow",
    notes: [
      ["D4", 1], ["E4", 1], ["F#4", 1], ["D4", 1],
      ["D4", 1], ["E4", 1], ["F#4", 1], ["D4", 1],
      ["F#4", 1], ["G4", 1], ["A4", 2],
      ["F#4", 1], ["G4", 1], ["A4", 2],
      ["A4", 0.5], ["B4", 0.5], ["A4", 0.5], ["G4", 0.5], ["F#4", 1], ["D4", 1],
      ["A4", 0.5], ["B4", 0.5], ["A4", 0.5], ["G4", 0.5], ["F#4", 1], ["D4", 1],
    ],
    tips: ["Sing the round softly.", "Keep fingers light."],
  },
  {
    id: "london-bridge",
    title: "London Bridge",
    level: "beginner",
    bpm: 96,
    key: "D major",
    strings: ["D", "A"],
    focus: "Finger steps and bow control",
    notes: [
      ["A4", 1], ["B4", 1], ["A4", 1], ["G4", 1], ["F#4", 1], ["G4", 1], ["A4", 2],
      ["D4", 1], ["E4", 1], ["F#4", 1], ["G4", 1], ["F#4", 1], ["E4", 1], ["D4", 2],
    ],
    tips: ["Keep the bow straight during steps.", "Listen for clean finger changes."],
  },
  {
    id: "itsy-bitsy",
    title: "Itsy Bitsy Spider",
    level: "beginner",
    bpm: 88,
    key: "A major",
    strings: ["A", "E"],
    focus: "Short bows and clear rhythm",
    notes: [
      ["A4", 1], ["A4", 1], ["C#5", 1], ["C#5", 1], ["E5", 2],
      ["D5", 1], ["C#5", 1], ["B4", 1], ["A4", 1], ["B4", 1], ["C#5", 1], ["D5", 2],
      ["E5", 1], ["E5", 1], ["F#5", 1], ["G#5", 1], ["A5", 2],
      ["G#5", 1], ["F#5", 1], ["E5", 1], ["D5", 1], ["C#5", 2],
    ],
    tips: ["Tiny bows for the spider steps.", "Keep the fingers quick and light."],
  },
  {
    id: "muffin-man",
    title: "The Muffin Man",
    level: "beginner",
    bpm: 92,
    key: "D major",
    strings: ["D", "A"],
    focus: "Bouncy rhythm and finger patterns",
    notes: [
      ["D4", 1], ["E4", 1], ["F#4", 1], ["G4", 1], ["A4", 2],
      ["A4", 1], ["B4", 1], ["A4", 1], ["G4", 1], ["F#4", 2],
      ["D4", 1], ["E4", 1], ["F#4", 1], ["G4", 1], ["A4", 2],
      ["F#4", 1], ["E4", 1], ["D4", 2],
    ],
    tips: ["Imagine the muffin man dancing.", "Keep bow lifts tiny."],
  },
  {
    id: "yankee-doodle",
    title: "Yankee Doodle",
    level: "early",
    bpm: 104,
    key: "D major",
    strings: ["D", "A"],
    focus: "March rhythm and quick fingers",
    notes: [
      ["D4", 1], ["D4", 1], ["E4", 1], ["F#4", 1], ["D4", 1], ["F#4", 1], ["E4", 2],
      ["D4", 1], ["F#4", 1], ["G4", 1], ["A4", 1], ["B4", 1], ["A4", 1], ["F#4", 2],
      ["D4", 1], ["D4", 1], ["E4", 1], ["F#4", 1], ["D4", 1], ["F#4", 1], ["E4", 2],
      ["D4", 1], ["E4", 1], ["F#4", 1], ["G4", 1], ["A4", 1], ["B4", 1], ["A4", 2],
    ],
    tips: ["March the beat with your feet.", "Keep the bow light and springy."],
  },
  {
    id: "saints",
    title: "When the Saints Go Marching In",
    level: "early",
    bpm: 96,
    key: "D major",
    strings: ["D", "A"],
    focus: "Strong beat and open tone",
    notes: [
      ["D4", 1], ["F#4", 1], ["G4", 1], ["A4", 2],
      ["A4", 1], ["B4", 1], ["A4", 1], ["G4", 1], ["F#4", 2],
      ["D4", 1], ["F#4", 1], ["G4", 1], ["A4", 2],
      ["G4", 1], ["F#4", 1], ["E4", 1], ["D4", 3],
    ],
    tips: ["Play with a strong marching beat.", "Let open strings ring."],
  },
].map((song) => ({
  ...song,
  notes: song.notes.map(([note, beats]) => ({ note, beats })),
}));

const LEARNING_PATH = [
  {
    id: "open-strings",
    title: "Open Strings Explorer",
    detail: "G, D, A, E with smooth bows.",
    requirement: (stats) => stats.totalMinutes >= 30,
  },
  {
    id: "first-fingers",
    title: "First Finger Hero",
    detail: "Confident first finger on A + E.",
    requirement: (stats) => stats.totalSessions >= 5,
  },
  {
    id: "rhythm-spark",
    title: "Rhythm Spark",
    detail: "Score 20+ in Rhythm Dash or Panda Pizzicato.",
    requirement: (stats) => stats.bestRhythm >= 20 || stats.bestPizzicato >= 20,
  },
  {
    id: "song-starter",
    title: "Song Starter",
    detail: "Play along with 3 songs.",
    requirement: (stats, songLogs) => new Set(songLogs.map((s) => s.songId)).size >= 3,
  },
  {
    id: "intonation-star",
    title: "Intonation Star",
    detail: "Average accuracy 80%+.",
    requirement: (stats) => (stats.accuracyAvg || 0) >= 80,
  },
  {
    id: "performance-ready",
    title: "Performance Ready",
    detail: "7-day streak + 300 minutes.",
    requirement: (stats) => stats.streak >= 7 && stats.totalMinutes >= 300,
  },
];

const DB_NAME = "emerson-violin";
const DB_VERSION = 3;
const dbPromise = openDB();

init();

async function init() {
  setupNavigation();
  setupConnectivity();
  setupInstallTip();
  setupLifecycle();
  setupCoach();
  setupTuner();
  setupMetronome();
  setupRhythmGame();
  setupPracticeLogger();
  await setupQuest();
  setupPracticeTimer();
  await setupSongs();
  setupGames();
  setupRecording();
  setupParent();
  setupReminderTimer();
  await refreshDashboard();
  registerServiceWorker();
  requestPersistence();
}

function updatePitchTargetLabel() {
  const targetEl = $("#pitch-target");
  if (targetEl) targetEl.textContent = `Target: ${currentTarget}`;
}

async function ensureAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") {
    try { await audioCtx.resume(); } catch (err) { /* ignore */ }
  }
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch (err) {
    console.warn("Wake lock failed", err);
  }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release(); } catch (err) { /* ignore */ }
    wakeLock = null;
  }
}

function computeStats(sessions, games, recordings) {
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes || 0), 0);
  const streak = calcStreak(sessions);
  const weekMinutes = calcWeeklyMinutes(sessions);
  const todayKey = dayKey(new Date());
  const todayMinutes = sessions
    .filter((s) => dayKey(new Date(s.date)) === todayKey)
    .reduce((sum, s) => sum + (s.minutes || 0), 0);
  const focusValues = sessions.map((s) => s.focus).filter((v) => typeof v === "number");
  const focusAvg = focusValues.length ? focusValues.reduce((a, b) => a + b, 0) / focusValues.length : 0;
  const accuracyValues = sessions.map((s) => s.accuracy).filter((v) => typeof v === "number");
  const accuracyAvg = accuracyValues.length ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length : 0;

  const byType = games.reduce((acc, g) => {
    acc[g.type] = acc[g.type] || [];
    acc[g.type].push(g);
    return acc;
  }, {});

  const bestBow = Math.max(0, ...(byType.bow || []).map((g) => g.score || 0));
  const bestPitch = Math.max(0, ...(byType.pitch || []).map((g) => g.score || 0));
  const bestRhythm = Math.max(0, ...(byType.rhythm || []).map((g) => g.score || 0));
  const bestPizzicato = Math.max(0, ...(byType.pizzicato || []).map((g) => g.score || 0));
  const bestMemory = Math.max(0, ...(byType.memory || []).map((g) => g.score || 0));
  const bestEar = Math.max(0, ...(byType.ear || []).map((g) => g.score || 0));
  const bestPattern = Math.max(0, ...(byType.pattern || []).map((g) => g.score || 0));

  const stars7d = games
    .filter((g) => Date.now() - new Date(g.date).getTime() < 7 * 86400000)
    .reduce((sum, g) => sum + (g.stars || 0), 0);

  return {
    totalMinutes,
    streak,
    weekMinutes,
    todayMinutes,
    focusAvg,
    accuracyAvg,
    totalSessions: sessions.length,
    totalRecordings: recordings.length,
    totalGames: games.length,
    stars7d,
    bestBow,
    bestPitch,
    bestRhythm,
    bestPizzicato,
    bestMemory,
    bestEar,
    bestPattern,
  };
}

function renderStickerShelf(stats) {
  const stickers = [
    { id: "bow", unlocked: stats.bestBow >= 15, hint: "Hold a bow for 15s" },
    { id: "rhythm", unlocked: stats.bestRhythm >= 40 || stats.bestPizzicato >= 40, hint: "Score 40+ in a rhythm game" },
    { id: "focus", unlocked: stats.focusAvg >= 4, hint: "Average focus 4+" },
    { id: "brave", unlocked: stats.totalSessions >= 5, hint: "Log 5 practice sessions" },
    { id: "violin", unlocked: stats.totalMinutes >= 120, hint: "Play 120 total minutes" },
    { id: "cheer", unlocked: stats.streak >= 5, hint: "Reach a 5-day streak" },
  ];

  stickers.forEach((sticker) => {
    const el = document.querySelector(`.sticker-item[data-sticker="${sticker.id}"]`);
    if (!el) return;
    const status = el.querySelector(".sticker-status");
    el.classList.toggle("unlocked", sticker.unlocked);
    el.classList.toggle("locked", !sticker.unlocked);
    if (status) status.textContent = sticker.unlocked ? "Unlocked!" : `Locked • ${sticker.hint}`;
  });

  const summary = $("#sticker-summary");
  if (summary) {
    const unlockedCount = stickers.filter((s) => s.unlocked).length;
    summary.textContent = `${unlockedCount} / ${stickers.length} stickers unlocked`;
  }
}

async function updateGoalProgress(stats) {
  let goal = await getSetting("goalMinutes", 20);
  if (!goal || Number.isNaN(goal)) goal = 20;
  const text = $("#goal-progress-text");
  const bar = $("#goal-progress-bar");
  const percent = Math.min(100, Math.round((stats.todayMinutes / goal) * 100));
  if (text) text.textContent = `${stats.todayMinutes} / ${goal} min`;
  if (bar) bar.style.width = `${percent}%`;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2400);
}

function setupConnectivity() {
  const banner = $("#offline-banner");
  const update = () => {
    if (!banner) return;
    if (navigator.onLine) {
      banner.classList.remove("show");
    } else {
      banner.classList.add("show");
    }
  };
  window.addEventListener("online", () => {
    update();
    showToast("Back online");
  });
  window.addEventListener("offline", () => {
    update();
    showToast("Offline mode");
  });
  update();
}

function setupInstallTip() {
  const tip = $("#install-tip");
  if (!tip) return;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS && !isStandalone) {
    tip.classList.remove("hidden");
  } else {
    tip.classList.add("hidden");
  }
}

function setupLifecycle() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopTuner();
      stopSongPlayback(false);
      releaseWakeLock();
    }
  });
  window.addEventListener("pagehide", () => {
    stopTuner();
    stopSongPlayback(false);
    releaseWakeLock();
  });
}

function setupNavigation() {
  const buttons = $$("[data-nav]");
  const views = $$(".view");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.nav;
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      views.forEach((v) => v.classList.toggle("active", v.dataset.view === target));
      if (history.replaceState) {
        const url = target === "home" ? "./" : `?view=${target}`;
        history.replaceState(null, "", url);
      }
      if (target === "analysis") {
        renderAnalysis();
      }
      if (target === "games") {
        renderGameCoach();
      }
      if (target === "songs") {
        renderSongsView();
      }
      if (target === "progress") {
        renderProgress();
      }
    });
  });
  const params = new URLSearchParams(window.location.search);
  const initial = params.get("view");
  if (initial) {
    const btn = document.querySelector(`[data-nav="${initial}"]`);
    if (btn) btn.click();
  }

  $("#start-practice").addEventListener("click", () => {
    document.querySelector('[data-nav="coach"]').click();
  });
}

function setupCoach() {
  const notesEl = $("#coach-notes");
  notesEl.textContent = "Tap Start Listening to get live tuning feedback.";

  $("#coach-speak").addEventListener("click", () => {
    const tip = tips[Math.floor(Math.random() * tips.length)];
    notesEl.textContent = tip;
    if (voiceEnabled) speak(tip);
  });

  $("#toggle-voice").addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    $("#toggle-voice").textContent = `Voice: ${voiceEnabled ? "On" : "Off"}`;
    showToast(voiceEnabled ? "Voice coaching on" : "Voice coaching off");
  });

  $$("#view-coach .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      currentTarget = chip.dataset.target;
      updatePitchTargetLabel();
      showToast(`Target set to ${currentTarget}`);
    });
  });

  const chatLog = $("#chat-log");
  if (chatLog && !chatLog.childElementCount) {
    addChatBubble("Hi Emerson! Ask me about bowing, rhythm, or a song you love. 🐼", "coach");
  }
  const send = $("#chat-send");
  const input = $("#chat-input");
  if (send && input) {
    const handler = () => handleCoachChat();
    send.addEventListener("click", handler);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handler();
      }
    });
  }
}

function setupGames() {
  setupPitchQuest();
  setupRhythmDash();
  setupMemoryGame();
  setupBowHold();
  setupEarTrainer();
  setupRhythmPainter();
  setupGameCoach();
}

async function setupSongs() {
  const list = $("#song-list");
  if (!list) return;

  const savedSong = await getSetting("lastSongId", SONG_LIBRARY[0]?.id || null);
  const savedTempo = await getSetting("songTempo", SONG_LIBRARY[0]?.bpm || 84);
  const savedFavorites = await getSetting("favoriteSongs", []);
  favoriteSongIds = new Set(Array.isArray(savedFavorites) ? savedFavorites : []);

  songState.selectedId = savedSong;
  songState.tempo = savedTempo;

  await renderSongLibrary();
  selectSongById(songState.selectedId || SONG_LIBRARY[0]?.id, { silent: true });

  const tempoSlider = $("#song-tempo");
  const tempoDisplay = $("#song-tempo-display");
  if (tempoSlider) {
    tempoSlider.value = songState.tempo;
    if (tempoDisplay) tempoDisplay.textContent = `${songState.tempo} BPM`;
    tempoSlider.addEventListener("input", () => {
      songState.tempo = parseInt(tempoSlider.value, 10);
      tempoDisplay.textContent = `${tempoSlider.value} BPM`;
      setSetting("songTempo", songState.tempo);
    });
  }

  $("#song-search").addEventListener("input", renderSongLibrary);
  $("#song-level-filter").addEventListener("change", renderSongLibrary);
  $("#song-string-filter").addEventListener("change", renderSongLibrary);

  $("#song-start").addEventListener("click", () => startSongPlayback());
  $("#song-stop").addEventListener("click", () => stopSongPlayback());
  $("#song-preview").addEventListener("click", () => startSongPlayback({ preview: true }));

  songState.guide = $("#song-guide").checked;
  songState.click = $("#song-click").checked;
  songState.drone = $("#song-drone").checked;
  songState.loop = $("#song-loop").checked;

  $("#song-guide").addEventListener("change", (event) => {
    songState.guide = event.target.checked;
  });
  $("#song-click").addEventListener("change", (event) => {
    songState.click = event.target.checked;
  });
  $("#song-drone").addEventListener("change", (event) => {
    songState.drone = event.target.checked;
  });
  $("#song-loop").addEventListener("change", (event) => {
    songState.loop = event.target.checked;
  });

  $("#song-rate-easy").addEventListener("click", () => rateSelectedSong("easy"));
  $("#song-rate-ok").addEventListener("click", () => rateSelectedSong("ok"));
  $("#song-rate-tricky").addEventListener("click", () => rateSelectedSong("tricky"));

  $("#browse-songs").addEventListener("click", () => {
    document.querySelector('[data-nav="songs"]').click();
  });

  $("#play-song-of-day").addEventListener("click", () => {
    const song = pickSongOfDay();
    selectSongById(song.id);
    document.querySelector('[data-nav="songs"]').click();
    startSongPlayback();
  });

  $("#start-daily-plan").addEventListener("click", () => {
    document.querySelector('[data-nav="trainer"]').click();
    showToast("Plan started! Follow the steps and have fun 🎻");
  });

  $("#refresh-daily-plan").addEventListener("click", async () => {
    await refreshDashboard();
    showToast("Plan refreshed ✨");
  });

  $("#refresh-ml").addEventListener("click", async () => {
    await renderSmartCoach();
    showToast("Coach insights updated");
  });

  renderSongOfDay();
  await populateAssignedSongOptions();
}

async function renderSongsView() {
  await renderSongLibrary();
  await renderRepertoire();
  renderSongOfDay();
}

async function renderSongLibrary() {
  const list = $("#song-list");
  if (!list) return;
  const schedule = await getSongSchedule();
  const now = Date.now();
  const query = $("#song-search").value.trim().toLowerCase();
  const levelFilter = $("#song-level-filter").value;
  const stringFilter = $("#song-string-filter").value;

  const filtered = SONG_LIBRARY.filter((song) => {
    const matchQuery = !query || song.title.toLowerCase().includes(query);
    const matchLevel = levelFilter === "all" || song.level === levelFilter;
    const matchString = stringFilter === "all" || song.strings.includes(stringFilter);
    return matchQuery && matchLevel && matchString;
  });

  list.innerHTML = "";
  if (!filtered.length) {
    list.textContent = "No songs found. Try a different filter.";
    return;
  }

  filtered.forEach((song) => {
    const card = document.createElement("div");
    card.className = "song-card";
    const isFav = favoriteSongIds.has(song.id);
    const due = schedule[song.id] ? new Date(schedule[song.id].due).getTime() : null;
    const dueSoon = due !== null && due <= now;
    card.innerHTML = `
      <h3>${song.title}</h3>
      <div class="song-meta">
        <span class="song-chip">${formatLevel(song.level)}</span>
        <span class="song-chip">${song.key}</span>
        <span class="song-chip">${song.bpm} BPM</span>
        <span class="song-chip">Strings: ${song.strings.join(" ")}</span>
      </div>
      <div class="muted">${song.focus}</div>
      ${dueSoon ? `<div class="song-due">Due: ${formatDueDate(schedule[song.id].due)}</div>` : ""}
    `;
    const row = document.createElement("div");
    row.className = "row";
    const selectBtn = document.createElement("button");
    selectBtn.className = "ghost";
    selectBtn.textContent = "Select";
    selectBtn.addEventListener("click", () => selectSongById(song.id));
    const playBtn = document.createElement("button");
    playBtn.className = "primary";
    playBtn.textContent = "Play Along";
    playBtn.addEventListener("click", () => {
      selectSongById(song.id);
      startSongPlayback();
    });
    const favBtn = document.createElement("button");
    favBtn.className = "ghost";
    favBtn.textContent = isFav ? "★ Favorite" : "☆ Favorite";
    favBtn.addEventListener("click", async () => {
      toggleFavorite(song.id);
      favBtn.textContent = favoriteSongIds.has(song.id) ? "★ Favorite" : "☆ Favorite";
      await setSetting("favoriteSongs", Array.from(favoriteSongIds));
    });
    row.appendChild(selectBtn);
    row.appendChild(playBtn);
    row.appendChild(favBtn);
    card.appendChild(row);
    list.appendChild(card);
  });
}

function toggleFavorite(songId) {
  if (favoriteSongIds.has(songId)) {
    favoriteSongIds.delete(songId);
  } else {
    favoriteSongIds.add(songId);
  }
}

function selectSongById(songId, { silent = false } = {}) {
  const song = SONG_LIBRARY.find((s) => s.id === songId) || SONG_LIBRARY[0];
  if (!song) return;
  songState.selectedId = song.id;
  const selectedEl = $("#song-selected");
  const metaEl = $("#song-meta");
  if (selectedEl) selectedEl.textContent = song.title;
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="song-chip">${formatLevel(song.level)}</span>
      <span class="song-chip">${song.key}</span>
      <span class="song-chip">${song.strings.join(" ")}</span>
      <span class="song-chip">${song.bpm} BPM</span>
    `;
  }
  const tempoSlider = $("#song-tempo");
  const tempoDisplay = $("#song-tempo-display");
  if (tempoSlider && !silent) {
    tempoSlider.value = song.bpm;
    songState.tempo = song.bpm;
    if (tempoDisplay) tempoDisplay.textContent = `${song.bpm} BPM`;
    setSetting("songTempo", song.bpm);
  }

  renderSongTimeline(song);
  updateSongCoachTip(song);
  setSetting("lastSongId", song.id);
  renderSongNextDue(song.id);
}

function renderSongTimeline(song) {
  const timeline = $("#song-timeline");
  if (!timeline) return;
  timeline.innerHTML = "";
  songTimeline = [];
  let beat = 0;
  song.notes.forEach((noteObj, index) => {
    const chip = document.createElement("div");
    chip.className = "note-chip";
    chip.textContent = noteObj.note === "R" ? "Rest" : noteObj.note;
    timeline.appendChild(chip);
    songTimeline.push({
      index,
      startBeat: beat,
      endBeat: beat + noteObj.beats,
      note: noteObj.note,
      element: chip,
    });
    beat += noteObj.beats;
  });
}

function updateSongCoachTip(song) {
  const coach = $("#song-coach");
  if (!coach) return;
  const tip = song.tips ? song.tips[Math.floor(Math.random() * song.tips.length)] : "Play slowly and enjoy the melody.";
  coach.textContent = tip;
}

function pickSongOfDay() {
  const key = dayKey(new Date());
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 10000;
  return SONG_LIBRARY[hash % SONG_LIBRARY.length];
}

function renderSongOfDay() {
  const song = pickSongOfDay();
  const card = $("#song-of-day");
  if (card) {
    card.innerHTML = `
      <div><strong>${song.title}</strong></div>
      <div class="muted">${formatLevel(song.level)} • ${song.key}</div>
      <div class="song-meta">
        <span class="song-chip">${song.bpm} BPM</span>
        <span class="song-chip">Strings: ${song.strings.join(" ")}</span>
      </div>
    `;
  }
  const meta = $("#song-of-day-meta");
  if (meta) meta.textContent = song.focus;
}

async function rateSelectedSong(rating) {
  const song = getSelectedSong();
  if (!song) return;
  const dueDate = await updateSongSchedule(song.id, rating);
  renderSongNextDue(song.id, dueDate);
  showToast("Song reflection saved!");
  await renderSongLibrary();
  await renderRepertoire();
}

async function getSongSchedule() {
  const schedule = await getSetting("songSchedule", {});
  return schedule && typeof schedule === "object" ? schedule : {};
}

async function getDueSong() {
  const schedule = await getSongSchedule();
  const now = Date.now();
  let best = null;
  Object.entries(schedule).forEach(([songId, entry]) => {
    const due = new Date(entry.due).getTime();
    if (Number.isNaN(due)) return;
    if (due <= now) {
      const song = SONG_LIBRARY.find((s) => s.id === songId);
      if (song) best = song;
    }
  });
  return best;
}

async function updateSongSchedule(songId, rating) {
  const schedule = await getSongSchedule();
  const now = new Date();
  const entry = schedule[songId] || { ease: 2.4, interval: 1, due: now.toISOString() };
  let ease = entry.ease;
  let interval = entry.interval;
  if (rating === "easy") {
    ease = Math.min(3.0, ease + 0.2);
    interval = Math.max(2, Math.round(interval * 1.7 + 1));
  } else if (rating === "ok") {
    interval = Math.max(1, Math.round(interval * 1.4 + 1));
  } else {
    ease = Math.max(1.3, ease - 0.2);
    interval = 1;
  }
  const due = new Date(now.getTime() + interval * 86400000).toISOString();
  schedule[songId] = { ease, interval, due };
  await setSetting("songSchedule", schedule);
  return due;
}

async function renderSongNextDue(songId, dueOverride) {
  const label = $("#song-next-due");
  if (!label) return;
  const schedule = await getSongSchedule();
  const due = dueOverride || (schedule[songId] ? schedule[songId].due : null);
  label.textContent = due ? `Next reminder: ${formatDueDate(due)}` : "Next reminder: rate the song to schedule it.";
}

function formatDueDate(dueIso) {
  const due = new Date(dueIso);
  const now = new Date();
  const days = Math.round((due - now) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return due.toLocaleDateString();
}

async function populateAssignedSongOptions() {
  const select = $("#assigned-song");
  if (!select) return;
  const current = select.value || "auto";
  const options = [
    { value: "auto", label: "Auto (Song of the day)" },
    ...SONG_LIBRARY.map((song) => ({ value: song.id, label: song.title })),
  ];
  select.innerHTML = "";
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  });
  select.value = current;
}

async function renderRepertoire() {
  const statsEl = $("#repertoire-stats");
  const grid = $("#repertoire-grid");
  if (!statsEl || !grid) return;
  const logs = await getSongLogs();
  const schedule = await getSongSchedule();
  const now = Date.now();
  const totals = logs.reduce((acc, log) => {
    acc.count += 1;
    acc.minutes += (log.durationSec || 0) / 60;
    acc.bySong[log.songId] = (acc.bySong[log.songId] || 0) + 1;
    return acc;
  }, { count: 0, minutes: 0, bySong: {} });
  const unique = Object.keys(totals.bySong).length;

  statsEl.innerHTML = `
    <div>Total Plays: <strong>${totals.count}</strong></div>
    <div>Unique Songs: <strong>${unique}</strong></div>
    <div>Play Time: <strong>${Math.round(totals.minutes)} min</strong></div>
  `;

  grid.innerHTML = "";
  if (!logs.length) {
    grid.textContent = "Play a song to start your repertoire!";
    return;
  }

  SONG_LIBRARY.forEach((song) => {
    const plays = totals.bySong[song.id] || 0;
    if (!plays && !favoriteSongIds.has(song.id)) return;
    const due = schedule[song.id] ? new Date(schedule[song.id].due).getTime() : null;
    const dueLabel = due && due <= now ? `Due: ${formatDueDate(schedule[song.id].due)}` : "";
    const card = document.createElement("div");
    card.className = "repertoire-card";
    card.innerHTML = `
      <div>${song.title}</div>
      <div class="muted">${formatLevel(song.level)} • ${song.key}</div>
      <div>Plays: <strong>${plays}</strong></div>
      ${dueLabel ? `<div class="song-due">${dueLabel}</div>` : ""}
    `;
    grid.appendChild(card);
  });
}

function getSelectedSong() {
  return SONG_LIBRARY.find((s) => s.id === songState.selectedId) || SONG_LIBRARY[0];
}

async function startSongPlayback({ preview = false, preserveStart = false } = {}) {
  const song = getSelectedSong();
  if (!song) return;
  await ensureAudioContext();
  stopSongPlayback(false);
  stopSongNodes();
  await requestWakeLock();

  songState.playing = true;
  songState.previewing = preview;
  const tempo = parseInt($("#song-tempo").value, 10) || song.bpm;
  const secondsPerBeat = 60 / tempo;
  const countInBeats = 2;
  const noteSequence = preview ? sliceNotesByBeats(song.notes, 8) : song.notes;
  const totalBeats = noteSequence.reduce((sum, n) => sum + n.beats, 0);
  songPlaybackSequence = noteSequence;
  songPlaybackTotalBeats = totalBeats;
  if (!preserveStart) songPracticeStart = Date.now();

  const startTime = audioCtx.currentTime + 0.15;
  const musicStart = startTime + countInBeats * secondsPerBeat;
  songCountInBeats = countInBeats;
  songCountInDuration = countInBeats * secondsPerBeat * 1000;
  songProgressStart = performance.now();
  songProgressDuration = (countInBeats + totalBeats) * secondsPerBeat * 1000;

  if (songState.click) {
    const totalClickBeats = countInBeats + totalBeats;
    for (let beat = 0; beat <= totalClickBeats; beat += 1) {
      const when = startTime + beat * secondsPerBeat;
      scheduleClickAt(when, beat % 4 === 0);
    }
  }

  if (songState.drone) {
    const droneFreq = noteToFrequency("A4");
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = droneFreq;
    osc.type = "triangle";
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.3);
    gain.gain.setValueAtTime(0.08, startTime + totalBeats * secondsPerBeat);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + (totalBeats + countInBeats) * secondsPerBeat);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + (totalBeats + countInBeats) * secondsPerBeat + 0.1);
    songPlaybackNodes.push(osc, gain);
  }

  if (songState.guide) {
    let beatCursor = 0;
    noteSequence.forEach((noteObj) => {
      const freq = noteToFrequency(noteObj.note);
      const duration = noteObj.beats * secondsPerBeat * 0.9;
      const when = musicStart + beatCursor * secondsPerBeat;
      if (freq) {
        scheduleGuideTone(freq, when, duration);
      }
      beatCursor += noteObj.beats;
    });
  }

  songPlaybackStart = performance.now() + countInBeats * secondsPerBeat * 1000;
  updateSongHighlight(secondsPerBeat, totalBeats);

  clearTimeout(songPlaybackTimeout);
  songPlaybackTimeout = setTimeout(async () => {
    if (songState.loop && !preview) {
      await startSongPlayback({ preview: false, preserveStart: true });
      return;
    }
    await finishSongPlayback({ preview });
  }, (countInBeats + totalBeats) * secondsPerBeat * 1000 + 200);

  showToast(preview ? "Previewing song ✨" : "Play along started!");
}

function stopSongPlayback(log = true) {
  if (!songState.playing) return;
  const wasPreviewing = songState.previewing;
  songState.playing = false;
  songState.previewing = false;
  clearTimeout(songPlaybackTimeout);
  if (songHighlightTimer) cancelAnimationFrame(songHighlightTimer);
  songTimeline.forEach((entry) => entry.element && entry.element.classList.remove("active"));
  const bar = $("#song-progress-bar");
  if (bar) bar.style.width = "0%";
  const countdown = $("#song-countdown");
  if (countdown) countdown.textContent = "Ready to play!";
  stopSongNodes();
  releaseWakeLock();
  if (log && !songPlaybackSequence.length) return;
  if (log && !wasPreviewing) {
    const durationSec = Math.max(1, Math.round((Date.now() - songPracticeStart) / 1000));
    logSongPractice(durationSec);
  }
  if (log) showToast("Song stopped");
}

async function finishSongPlayback({ preview = false } = {}) {
  songState.playing = false;
  songState.previewing = false;
  if (songHighlightTimer) cancelAnimationFrame(songHighlightTimer);
  songTimeline.forEach((entry) => entry.element && entry.element.classList.remove("active"));
  const bar = $("#song-progress-bar");
  if (bar) bar.style.width = "0%";
  const countdown = $("#song-countdown");
  if (countdown) countdown.textContent = preview ? "Preview done!" : "Song complete!";
  stopSongNodes();
  releaseWakeLock();
  if (!preview) {
    const durationSec = Math.max(1, Math.round((Date.now() - songPracticeStart) / 1000));
    await logSongPractice(durationSec);
  }
  await renderRepertoire();
  showToast(preview ? "Preview done!" : "Song complete!");
}

function stopSongNodes() {
  songPlaybackNodes.forEach((node) => {
    try { node.stop(); } catch (err) { /* ignore */ }
    try { node.disconnect(); } catch (err) { /* ignore */ }
  });
  songPlaybackNodes = [];
}

function updateSongHighlight(secondsPerBeat, totalBeats) {
  songHighlightTimer = requestAnimationFrame(() => updateSongHighlight(secondsPerBeat, totalBeats));
  const now = performance.now();
  const elapsed = (now - songPlaybackStart) / 1000;
  const beat = elapsed / secondsPerBeat;
  const progressElapsed = now - songProgressStart;
  const progress = songProgressDuration ? Math.min(1, Math.max(0, progressElapsed / songProgressDuration)) : 0;
  const bar = $("#song-progress-bar");
  if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  const countdown = $("#song-countdown");
  if (countdown) {
    if (progressElapsed < songCountInDuration) {
      const beatMs = songCountInDuration / songCountInBeats;
      const beatsLeft = Math.ceil((songCountInDuration - progressElapsed) / beatMs);
      countdown.textContent = `Count in: ${beatsLeft}`;
    } else if (songState.playing) {
      countdown.textContent = "Play!";
    } else {
      countdown.textContent = "Ready to play!";
    }
  }
  songTimeline.forEach((entry) => {
    entry.element.classList.toggle("active", beat >= entry.startBeat && beat < entry.endBeat);
  });
  if (beat > totalBeats) {
    songTimeline.forEach((entry) => entry.element.classList.remove("active"));
  }
}

function sliceNotesByBeats(notes, maxBeats) {
  const sliced = [];
  let total = 0;
  for (const note of notes) {
    if (total >= maxBeats) break;
    sliced.push(note);
    total += note.beats;
  }
  return sliced;
}

function scheduleClickAt(when, accent = false) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = accent ? 1400 : 1000;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.25 : 0.18, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(when);
  osc.stop(when + 0.09);
  songPlaybackNodes.push(osc, gain);
}

function scheduleGuideTone(freq, when, duration) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.18, when + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.05);
  songPlaybackNodes.push(osc, gain, filter);
}

async function logSongPractice(durationSec) {
  const song = getSelectedSong();
  if (!song) return;
  try {
    await addSongLog({
      songId: song.id,
      tempo: parseInt($("#song-tempo").value, 10) || song.bpm,
      durationSec,
    });
    await renderRepertoire();
  } catch (err) {
    console.warn("Song log failed", err);
  }
}

function formatLevel(level) {
  if (level === "beginner") return "Beginner";
  if (level === "early") return "Early Intermediate";
  if (level === "intermediate") return "Intermediate";
  return level;
}

function setupPitchQuest() {
  const resultEl = $("#pitch-result");
  updatePitchTargetLabel();
  const pitchAuto = $("#pitch-auto");
  if (pitchAuto) {
    getSetting("pitchAuto", true).then((val) => {
      pitchAuto.checked = Boolean(val);
    });
    pitchAuto.addEventListener("change", () => {
      setSetting("pitchAuto", pitchAuto.checked);
    });
  }

  $$(".pitch-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      currentTarget = chip.dataset.target;
      updatePitchTargetLabel();
      showToast(`Target set to ${currentTarget}`);
    });
  });

  $("#pitch-start").addEventListener("click", async () => {
    pitchGameSamples = [];
    pitchGameActive = true;
    resultEl.textContent = "Listening... play your note!";
    pitchGameAutoStop = !tunerActive;
    if (pitchAuto && pitchAuto.checked && adaptiveCoachEnabled) {
      const target = await recommendPitchTarget();
      if (target) {
        currentTarget = target;
        updatePitchTargetLabel();
      }
    }
    if (!tunerActive) {
      await startTuner();
    }
    clearTimeout(pitchGameTimer);
    pitchGameTimer = setTimeout(() => finishPitchQuest(), 4000);
  });

  $("#pitch-stop").addEventListener("click", () => finishPitchQuest(true));
}

function finishPitchQuest(manual = false) {
  if (!pitchGameActive && manual) return;
  pitchGameActive = false;
  clearTimeout(pitchGameTimer);
  const resultEl = $("#pitch-result");
  if (!pitchGameSamples.length) {
    resultEl.textContent = "No sound detected. Try again with a strong note.";
  } else {
    const avg = pitchGameSamples.reduce((a, b) => a + b, 0) / pitchGameSamples.length;
    const score = Math.round(avg * 100);
    const stars = Math.max(1, Math.round(avg * 5));
    resultEl.textContent = `Accuracy ${score}% • Stars ${"⭐".repeat(stars)}`;
    addGameResult({ type: "pitch", score, stars, target: currentTarget }).then(() => {
      refreshDashboard();
      renderGameCoach();
    });
  }
  if (pitchGameAutoStop) stopTuner();
}

function setupRhythmDash() {
  const tempo = $("#rhythm-tempo");
  const display = $("#rhythm-tempo-display");
  const beat = $("#rhythm-dash-beat");
  const scoreEl = $("#rhythm-dash-score");
  const rhythmAuto = $("#rhythm-auto");

  if (rhythmAuto) {
    getSetting("rhythmAuto", true).then((val) => {
      rhythmAuto.checked = Boolean(val);
    });
    rhythmAuto.addEventListener("change", () => {
      setSetting("rhythmAuto", rhythmAuto.checked);
    });
  }

  tempo.addEventListener("input", () => {
    rhythmDashTempo = parseInt(tempo.value, 10);
    display.textContent = `${tempo.value} BPM`;
  });

  $("#rhythm-dash-start").addEventListener("click", async () => {
    if (rhythmDashActive) return;
    await ensureAudioContext();
    if (rhythmAuto && rhythmAuto.checked && adaptiveCoachEnabled) {
      const recTempo = await recommendRhythmTempo();
      rhythmDashTempo = recTempo;
      tempo.value = recTempo;
      display.textContent = `${recTempo} BPM`;
    }
    rhythmDashActive = true;
    rhythmDashScore = 0;
    rhythmDashHits = 0;
    scoreEl.textContent = "Score: 0";
    rhythmDashStartTime = performance.now();
    const interval = 60000 / rhythmDashTempo;
    clearInterval(rhythmDashInterval);
    rhythmDashInterval = setInterval(() => {
      playClick();
      beat.classList.add("active");
      setTimeout(() => beat.classList.remove("active"), 200);
    }, interval);
  });

  $("#rhythm-dash-stop").addEventListener("click", () => {
    if (!rhythmDashActive) return;
    rhythmDashActive = false;
    clearInterval(rhythmDashInterval);
    $("#rhythm-dash-beat").classList.remove("active");
    const stars = rhythmDashHits ? Math.min(5, Math.ceil(rhythmDashScore / (rhythmDashHits * 5) * 5)) : 1;
    addGameResult({ type: "rhythm", score: rhythmDashScore, stars, tempo: rhythmDashTempo }).then(() => {
      refreshDashboard();
      renderGameCoach();
    });
    showToast("Rhythm Dash complete!");
  });

  $("#rhythm-dash-tap").addEventListener("click", () => {
    if (!rhythmDashActive) return;
    const interval = 60000 / rhythmDashTempo;
    const now = performance.now();
    const delta = (now - rhythmDashStartTime) % interval;
    const error = Math.min(delta, interval - delta);
    let points = 0;
    let label = "Keep going!";
    if (error < 80) { points = 5; label = "Perfect!"; }
    else if (error < 140) { points = 3; label = "Great!"; }
    else if (error < 220) { points = 1; label = "Nice!"; }
    rhythmDashScore += points;
    rhythmDashHits += 1;
    scoreEl.textContent = `Score: ${rhythmDashScore} • ${label}`;
  });
}

function setupMemoryGame() {
  const sequenceEl = $("#memory-sequence");
  const scoreEl = $("#memory-score");

  $("#memory-play").addEventListener("click", () => {
    if (memoryPlaying) return;
    const length = Math.min(5, 3 + Math.floor(memoryScore / 2));
    memorySequence = Array.from({ length }, () => randomNote());
    memoryInput = [];
    sequenceEl.textContent = "Listen...";
    playNoteSequence(memorySequence).then(() => {
      sequenceEl.textContent = `Your turn! (${length} notes)`;
    });
  });

  $("#memory-clear").addEventListener("click", () => {
    memoryInput = [];
    sequenceEl.textContent = "Ready for a melody!";
  });

  $$(".memory-note").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (memoryPlaying) return;
      if (!memorySequence.length) return;
      const note = btn.dataset.note;
      memoryInput.push(note);
      const index = memoryInput.length - 1;
      if (note !== memorySequence[index]) {
        sequenceEl.textContent = "Oops! Try the sequence again.";
        memoryInput = [];
        return;
      }
      if (memoryInput.length === memorySequence.length) {
        memoryScore += 1;
        const stars = Math.min(5, 1 + Math.floor(memoryScore / 2));
        scoreEl.textContent = `Score: ${memoryScore}`;
        sequenceEl.textContent = "Brilliant! Ready for the next one.";
        addGameResult({ type: "memory", score: memoryScore, stars }).then(() => {
          refreshDashboard();
          renderGameCoach();
        });
        memorySequence = [];
        memoryInput = [];
      }
    });
  });
}

function setupBowHold() {
  const timerEl = $("#bow-timer");
  const scoreEl = $("#bow-score");
  const pulse = $("#bow-pulse");

  $("#bow-start").addEventListener("click", () => {
    clearInterval(bowTimerId);
    bowStart = performance.now();
    bowTimerId = setInterval(() => {
      const elapsed = (performance.now() - bowStart) / 1000;
      timerEl.textContent = `${elapsed.toFixed(1)}s`;
      pulse.style.transform = `scale(${1 + Math.sin(performance.now() / 400) * 0.05})`;
    }, 100);
  });

  $("#bow-stop").addEventListener("click", () => {
    if (!bowStart) return;
    clearInterval(bowTimerId);
    const elapsed = (performance.now() - bowStart) / 1000;
    bowBest = Math.max(bowBest, elapsed);
    scoreEl.textContent = `Best: ${bowBest.toFixed(1)}s`;
    timerEl.textContent = `${elapsed.toFixed(1)}s`;
    const stars = Math.min(5, Math.max(1, Math.floor(elapsed / 5) + 1));
    addGameResult({ type: "bow", score: Math.round(elapsed), stars }).then(() => {
      refreshDashboard();
      renderGameCoach();
    });
    bowStart = 0;
  });
}

function setupEarTrainer() {
  const prompt = $("#ear-prompt");
  const scoreEl = $("#ear-score");

  const playTarget = async () => {
    await ensureAudioContext();
    if (!earTarget) earTarget = randomEarNote();
    const freq = violinTargets[earTarget];
    if (freq) playTone(freq, audioCtx.currentTime + 0.05, 0.5);
    if (prompt) prompt.textContent = "Listen carefully... what note is it?";
  };

  $("#ear-play").addEventListener("click", () => {
    earTarget = randomEarNote();
    playTarget();
  });

  $("#ear-repeat").addEventListener("click", () => {
    if (!earTarget) {
      earTarget = randomEarNote();
    }
    playTarget();
  });

  $$(".ear-note").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      if (!earTarget) {
        showToast("Tap play to hear a note first!");
        return;
      }
      const guess = btn.dataset.note;
      earRound += 1;
      if (guess === earTarget) {
        earScore += 5;
        prompt.textContent = `Yes! That was ${earTarget}.`;
        showToast("Great listening! ⭐");
      } else {
        prompt.textContent = `Nice try! It was ${earTarget}.`;
      }
      earTarget = null;
      scoreEl.textContent = `Score: ${earScore}`;
      if (earRound % 5 === 0) {
        const stars = Math.min(5, Math.max(1, Math.round(earScore / 10)));
        addGameResult({ type: "ear", score: earScore, stars, difficulty: earDifficulty }).then(() => {
          refreshDashboard();
          renderGameCoach();
        });
      }
    });
  });

  updateEarOptions();
}

function setupRhythmPainter() {
  const patternEl = $("#rhythm-pattern");
  const scoreEl = $("#pattern-score");

  const displayPattern = () => {
    if (!patternSequence.length) {
      patternEl.textContent = "Pattern: —";
      return;
    }
    const symbols = patternSequence.map((beat) => (beat <= 0.5 ? "♪" : "♩")).join(" ");
    patternEl.textContent = `Pattern: ${symbols}`;
  };

  $("#pattern-start").addEventListener("click", () => {
    patternSequence = Array.from({ length: patternLength }, () => (Math.random() > 0.4 ? 1 : 0.5));
    patternIndex = 0;
    patternScore = 0;
    patternStartTime = 0;
    displayPattern();
    scoreEl.textContent = "Score: 0";
    showToast("Pattern ready! Tap the beat.");
  });

  $("#pattern-tap").addEventListener("click", () => {
    if (!patternSequence.length) {
      showToast("Tap New Pattern first.");
      return;
    }
    const bpm = 96;
    const interval = 60000 / bpm;
    const now = performance.now();
    if (patternIndex === 0) {
      patternStartTime = now;
      patternScore += 2;
      patternIndex += 1;
      scoreEl.textContent = `Score: ${patternScore}`;
      return;
    }
    const expected = patternSequence.slice(0, patternIndex).reduce((sum, beat) => sum + beat, 0) * interval;
    const actual = now - patternStartTime;
    const error = Math.abs(actual - expected);
    if (error < 140) {
      patternScore += 5;
    } else if (error < 260) {
      patternScore += 3;
    } else {
      patternScore += 1;
    }
    patternIndex += 1;
    scoreEl.textContent = `Score: ${patternScore}`;
    if (patternIndex > patternSequence.length) {
      const stars = Math.min(5, Math.max(1, Math.round(patternScore / 8)));
      addGameResult({ type: "pattern", score: patternScore, stars, length: patternSequence.length }).then(() => {
        refreshDashboard();
        renderGameCoach();
      });
      showToast("Rhythm Painter complete!");
      patternSequence = [];
      patternIndex = 0;
      displayPattern();
    }
  });
}

async function setupGameCoach() {
  adaptiveCoachEnabled = await getSetting("adaptiveCoach", true);
  gameFocus = await getSetting("gameFocus", "auto");
  earDifficulty = parseInt(await getSetting("earDifficulty", 2), 10) || 2;
  patternLength = parseInt(await getSetting("patternLength", 4), 10) || 4;

  const adaptiveToggle = $("#adaptive-coach");
  if (adaptiveToggle) {
    adaptiveToggle.checked = Boolean(adaptiveCoachEnabled);
    adaptiveToggle.addEventListener("change", async () => {
      adaptiveCoachEnabled = adaptiveToggle.checked;
      await setSetting("adaptiveCoach", adaptiveCoachEnabled);
      renderGameCoach();
    });
  }

  const focusSelect = $("#game-focus");
  if (focusSelect) {
    focusSelect.value = gameFocus;
    focusSelect.addEventListener("change", async () => {
      gameFocus = focusSelect.value;
      await setSetting("gameFocus", gameFocus);
      renderGameCoach();
    });
  }

  const applyBtn = $("#apply-game-settings");
  if (applyBtn) applyBtn.addEventListener("click", () => applyGameRecommendations());
  const refreshBtn = $("#refresh-game-coach");
  if (refreshBtn) refreshBtn.addEventListener("click", () => renderGameCoach());

  updateEarOptions();
  renderGameCoach();
}

async function renderGameCoach() {
  const panel = $("#game-recommend");
  if (!panel) return;
  const games = await getGameResults();
  const recs = await getGameRecommendations(games);
  const focus = gameFocus === "auto" ? recs.focus : gameFocus;
  panel.innerHTML = `
    <div><strong>Focus:</strong> ${focusAreaLabel(focus)}</div>
    <div>Pitch Quest target: <strong>${recs.pitchTarget}</strong></div>
    <div>Rhythm Dash tempo: <strong>${recs.rhythmTempo} BPM</strong></div>
    <div>Ear Trainer difficulty: <strong>${recs.earDifficulty}</strong></div>
    <div>Rhythm Painter length: <strong>${recs.patternLength}</strong> beats</div>
  `;
}

async function getGameRecommendations(games) {
  const pitchTarget = await recommendPitchTarget(games);
  const rhythmTempo = await recommendRhythmTempo(games);
  const earDifficultyRec = recommendEarDifficulty(games);
  const patternLengthRec = recommendPatternLength(games);
  const focus = recommendGameFocus(games);
  return {
    pitchTarget,
    rhythmTempo,
    earDifficulty: earDifficultyRec,
    patternLength: patternLengthRec,
    focus,
  };
}

function recommendGameFocus(games) {
  const pitch = averageRecentScore(games, "pitch");
  const rhythm = averageRecentScore(games, "rhythm");
  const ear = averageRecentScore(games, "ear");
  const pattern = averageRecentScore(games, "pattern");
  const scores = [
    { type: "pitch", value: pitch || 50 },
    { type: "rhythm", value: rhythm || 50 },
    { type: "pattern", value: pattern || 50 },
    { type: "ear", value: ear || 50 },
  ];
  scores.sort((a, b) => a.value - b.value);
  return scores[0].type;
}

async function recommendPitchTarget(gamesOverride) {
  const games = gamesOverride || await getGameResults();
  const pitchGames = games.filter((g) => g.type === "pitch" && g.target);
  if (!pitchGames.length) return currentTarget;
  const grouped = pitchGames.reduce((acc, g) => {
    acc[g.target] = acc[g.target] || [];
    acc[g.target].push(g.score || 0);
    return acc;
  }, {});
  let weakest = currentTarget;
  let lowest = Infinity;
  Object.entries(grouped).forEach(([target, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < lowest) {
      lowest = avg;
      weakest = target;
    }
  });
  return weakest;
}

async function recommendRhythmTempo(gamesOverride) {
  const games = gamesOverride || await getGameResults();
  const avg = averageRecentScore(games, "rhythm");
  if (avg < 20) return 72;
  if (avg < 45) return 84;
  if (avg < 70) return 96;
  return 108;
}

function recommendEarDifficulty(gamesOverride) {
  const games = gamesOverride || [];
  const avg = averageRecentScore(games, "ear");
  if (avg < 10) return 1;
  if (avg < 30) return 2;
  return 3;
}

function recommendPatternLength(gamesOverride) {
  const games = gamesOverride || [];
  const avg = averageRecentScore(games, "pattern");
  if (avg < 10) return 3;
  if (avg < 25) return 4;
  return 5;
}

function averageRecentScore(games, type) {
  const recent = games.filter((g) => g.type === type).slice(-6);
  if (!recent.length) return 0;
  return recent.reduce((sum, g) => sum + (g.score || 0), 0) / recent.length;
}

async function applyGameRecommendations() {
  if (!adaptiveCoachEnabled) {
    showToast("Adaptive coach is off.");
    return;
  }
  const games = await getGameResults();
  const recs = await getGameRecommendations(games);
  currentTarget = recs.pitchTarget;
  updatePitchTargetLabel();

  const rhythmTempo = $("#rhythm-tempo");
  const rhythmDisplay = $("#rhythm-tempo-display");
  if (rhythmTempo) {
    rhythmTempo.value = recs.rhythmTempo;
    rhythmDashTempo = recs.rhythmTempo;
    if (rhythmDisplay) rhythmDisplay.textContent = `${recs.rhythmTempo} BPM`;
  }

  earDifficulty = recs.earDifficulty;
  patternLength = recs.patternLength;
  updateEarOptions();
  await setSetting("earDifficulty", earDifficulty);
  await setSetting("patternLength", patternLength);
  showToast("Coach settings applied!");
  renderGameCoach();
}

function randomNote() {
  const keys = Object.keys(violinTargets);
  return keys[Math.floor(Math.random() * keys.length)];
}

function randomEarNote() {
  const pool = getEarNotePool();
  return pool[Math.floor(Math.random() * pool.length)];
}

function getEarNotePool() {
  if (earDifficulty <= 1) return ["A4", "E5"];
  if (earDifficulty === 2) return ["D4", "A4", "E5"];
  return ["G3", "D4", "A4", "E5"];
}

function updateEarOptions() {
  const pool = new Set(getEarNotePool());
  $$(".ear-note").forEach((btn) => {
    const note = btn.dataset.note;
    btn.disabled = !pool.has(note);
  });
}

async function playNoteSequence(sequence) {
  await ensureAudioContext();
  memoryPlaying = true;
  let startTime = audioCtx.currentTime + 0.1;
  sequence.forEach((note, index) => {
    const freq = violinTargets[note];
    playTone(freq, startTime + index * 0.6, 0.35);
  });
  return new Promise((resolve) => {
    setTimeout(() => {
      memoryPlaying = false;
      resolve();
    }, sequence.length * 600 + 200);
  });
}

function playTone(freq, when, duration) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.3, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(when);
  osc.stop(when + duration + 0.05);
}

function setupTuner() {
  $("#coach-start").addEventListener("click", startTuner);
  $("#coach-stop").addEventListener("click", stopTuner);
  $("#tuner-start").addEventListener("click", startTuner);
  $("#tuner-stop").addEventListener("click", stopTuner);
  $$("#view-tuner .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      currentTarget = chip.dataset.target;
      updatePitchTargetLabel();
      showToast(`Target set to ${currentTarget}`);
    });
  });
}

async function startTuner() {
  try {
    await ensureAudioContext();
    await requestWakeLock();
    tunerStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(tunerStream);
    tunerAnalyser = audioCtx.createAnalyser();
    tunerAnalyser.fftSize = 2048;
    source.connect(tunerAnalyser);
    tunerHistory = [];
    coachAccuracySamples = [];
    tunerActive = true;
    updateTuner();
    showToast("Listening for violin sound");
  } catch (err) {
    console.error(err);
    showToast("Microphone access needed for tuning");
  }
}

function stopTuner() {
  if (tunerAnimation) cancelAnimationFrame(tunerAnimation);
  if (tunerStream) {
    tunerStream.getTracks().forEach((track) => track.stop());
    tunerStream = null;
  }
  tunerActive = false;
  releaseWakeLock();
  $("#coach-freq").textContent = "Stopped";
  $("#tuner-freq").textContent = "Stopped";
  toneHistory = [];
  liveMetrics = { stability: null, warmth: null, dynamics: null, vibrato: null };
  updateMetricUI("#metric-stability", "#metric-stability-bar", 0);
  updateMetricUI("#metric-warmth", "#metric-warmth-bar", 0);
  updateMetricUI("#metric-dynamics", "#metric-dynamics-bar", 0);
  updateMetricUI("#metric-vibrato", "#metric-vibrato-bar", 0);
  updateMetricUI(null, "#tone-stability-bar", 0);
  updateMetricUI(null, "#tone-warmth-bar", 0);
  updateMetricUI(null, "#tone-dynamics-bar", 0);
  const hint = $("#tone-hint");
  if (hint) hint.textContent = "Start the tuner to see live tone feedback.";
}

function updateTuner() {
  const buffer = new Float32Array(tunerAnalyser.fftSize);
  tunerAnalyser.getFloatTimeDomainData(buffer);
  const pitch = autoCorrelate(buffer, audioCtx.sampleRate);
  if (pitch !== -1) {
    const noteNumber = noteFromPitch(pitch);
    const noteName = noteStrings[noteNumber % 12];
    const octave = Math.floor(noteNumber / 12) - 1;
    const noteLabel = `${noteName}${octave}`;
    const cents = centsOffFromPitch(pitch, noteNumber);
    tunerHistory.push({ pitch, cents, time: Date.now() });
    if (tunerHistory.length > 120) tunerHistory.shift();

    if (pitchGameActive) {
      const targetFreq = violinTargets[currentTarget];
      if (targetFreq) {
        const targetNote = noteFromPitch(targetFreq);
        const targetCents = centsOffFromPitch(pitch, targetNote);
        const accuracy = Math.max(0, 50 - Math.abs(targetCents)) / 50;
        pitchGameSamples.push(accuracy);
      }
    }

    const targetFreq = violinTargets[currentTarget];
    if (targetFreq) {
      const targetNote = noteFromPitch(targetFreq);
      const targetCents = centsOffFromPitch(pitch, targetNote);
      coachAccuracySamples.push(Math.max(0, 50 - Math.abs(targetCents)) / 50);
    }

    updateTunerUI(noteLabel, pitch, cents);

    const now = Date.now();
    const freqData = new Float32Array(tunerAnalyser.frequencyBinCount);
    tunerAnalyser.getFloatFrequencyData(freqData);
    const rms = computeRMS(buffer);
    const centroid = computeSpectralCentroid(freqData, audioCtx.sampleRate);
    toneHistory.push({ time: now, rms, centroid, cents, pitch });
    if (toneHistory.length > 200) toneHistory.shift();
    if (now - lastToneUpdate > 220) {
      lastToneUpdate = now;
      updateLiveCoachMetrics();
    }
  }
  tunerAnimation = requestAnimationFrame(updateTuner);
}

function updateTunerUI(noteLabel, pitch, cents) {
  const rotation = Math.max(-50, Math.min(50, cents)) * 0.9;
  $("#coach-note").textContent = noteLabel;
  $("#tuner-note").textContent = noteLabel;
  $("#coach-freq").textContent = `${pitch.toFixed(1)} Hz`;
  $("#tuner-freq").textContent = `${pitch.toFixed(1)} Hz`;
  $("#coach-needle").style.transform = `rotate(${rotation}deg)`;
  $("#tuner-needle").style.transform = `rotate(${rotation}deg)`;

  const notesEl = $("#coach-notes");
  if (Math.abs(cents) < 8) {
    notesEl.textContent = "Perfectly centered! Keep that bow gentle.";
  } else if (cents < 0) {
    notesEl.textContent = "A tiny bit flat. Lightly lift the finger forward.";
  } else {
    notesEl.textContent = "A little sharp. Relax and slide back a hair.";
  }
}

function noteFromPitch(frequency) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function centsOffFromPitch(frequency, note) {
  return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2));
}

function frequencyFromNoteNumber(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function noteToFrequency(note) {
  if (!note || note === "R") return null;
  const match = note.match(/^([A-G])([#b]?)(-?\d)$/);
  if (!match) return null;
  const [, letter, accidental, octaveRaw] = match;
  const key = `${letter}${accidental || ""}`;
  const semitone = NOTE_OFFSETS[key];
  if (semitone === undefined) return null;
  const octave = parseInt(octaveRaw, 10);
  const midi = (octave + 1) * 12 + semitone;
  return frequencyFromNoteNumber(midi);
}

function autoCorrelate(buffer, sampleRate) {
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.01) return -1;

  let r1 = 0;
  let r2 = buffer.length - 1;
  const threshold = 0.2;
  for (let i = 0; i < buffer.length / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
  }
  for (let i = 1; i < buffer.length / 2; i++) {
    if (Math.abs(buffer[buffer.length - i]) < threshold) { r2 = buffer.length - i; break; }
  }
  const trimmed = buffer.slice(r1, r2);
  if (trimmed.length < 2) return -1;
  const c = new Array(trimmed.length).fill(0);
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }
  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmed.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let t0 = maxpos;
  if (maxpos <= 0 || maxpos >= c.length - 1) return -1;
  const x1 = c[t0 - 1];
  const x2 = c[t0];
  const x3 = c[t0 + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) t0 = t0 - b / (2 * a);
  return sampleRate / t0;
}

function computeRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

function computeSpectralCentroid(freqData, sampleRate) {
  let weighted = 0;
  let total = 0;
  const binCount = freqData.length;
  for (let i = 0; i < binCount; i++) {
    const db = freqData[i];
    const mag = Math.pow(10, db / 20);
    const freq = (i * sampleRate) / (2 * binCount);
    weighted += freq * mag;
    total += mag;
  }
  if (!total) return 0;
  return weighted / total;
}

function updateLiveCoachMetrics() {
  if (!toneHistory.length) return;
  const recent = toneHistory.filter((t) => Date.now() - t.time < 2500);
  if (!recent.length) return;
  const cents = recent.map((t) => t.cents);
  const rmsValues = recent.map((t) => t.rms);
  const centroids = recent.map((t) => t.centroid).filter((v) => v > 0);

  const stability = scoreFromStdDev(cents, 18);
  const dynamics = scoreFromRange(rmsValues, 0.06);
  const warmth = centroids.length ? scoreFromWarmth(centroids) : 0;
  const vibrato = scoreFromVibrato(recent.map((t) => t.cents), recent.map((t) => t.time));

  liveMetrics = { stability, dynamics, warmth, vibrato };

  updateMetricUI("#metric-stability", "#metric-stability-bar", stability);
  updateMetricUI("#metric-warmth", "#metric-warmth-bar", warmth);
  updateMetricUI("#metric-dynamics", "#metric-dynamics-bar", dynamics);
  updateMetricUI("#metric-vibrato", "#metric-vibrato-bar", vibrato);

  updateMetricUI(null, "#tone-stability-bar", stability);
  updateMetricUI(null, "#tone-warmth-bar", warmth);
  updateMetricUI(null, "#tone-dynamics-bar", dynamics);

  const hint = $("#tone-hint");
  if (hint) {
    hint.textContent = tunerActive ? "Listening… keep the bow steady." : "Start the tuner to see live tone feedback.";
  }
}

function scoreFromStdDev(values, targetStd) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  return clampScore(100 - (std / targetStd) * 100);
}

function scoreFromRange(values, targetRange) {
  if (!values.length) return 0;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  return clampScore((range / targetRange) * 100);
}

function scoreFromWarmth(centroids) {
  const avg = centroids.reduce((a, b) => a + b, 0) / centroids.length;
  const warm = 2000 - avg;
  return clampScore((warm / 1800) * 100);
}

function scoreFromVibrato(cents, times) {
  if (cents.length < 6) return 0;
  const mean = cents.reduce((a, b) => a + b, 0) / cents.length;
  let crossings = 0;
  for (let i = 1; i < cents.length; i++) {
    const prev = cents[i - 1] - mean;
    const curr = cents[i] - mean;
    if (prev === 0) continue;
    if (prev > 0 && curr < 0) crossings += 1;
    if (prev < 0 && curr > 0) crossings += 1;
  }
  const duration = (times[times.length - 1] - times[0]) / 1000;
  if (duration <= 0) return 0;
  const rate = crossings / (2 * duration);
  return clampScore(((rate - 3) / 5) * 100);
}

function updateMetricUI(textSel, barSel, value) {
  const bar = barSel ? document.querySelector(barSel) : null;
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, value || 0))}%`;
  if (textSel) {
    const el = document.querySelector(textSel);
    if (el) el.textContent = value ? `${value}%` : "—";
  }
}

function setupMetronome() {
  const tempoInput = $("#tempo");
  const display = $("#tempo-display");
  const pulse = $("#metro-pulse");
  let intervalId;

  tempoInput.addEventListener("input", () => {
    display.textContent = `${tempoInput.value} BPM`;
  });

  $("#metro-start").addEventListener("click", async () => {
    await ensureAudioContext();
    const bpm = parseInt(tempoInput.value, 10);
    const interval = 60000 / bpm;
    clearInterval(intervalId);
    intervalId = setInterval(() => {
      playClick();
      pulse.style.transform = "scale(1.08)";
      setTimeout(() => (pulse.style.transform = "scale(1)"), 120);
    }, interval);
  });

  $("#metro-stop").addEventListener("click", () => {
    clearInterval(intervalId);
  });
}

function playClick() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.value = 1000;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.09);
}

function setupRhythmGame() {
  const lane = $("#rhythm-lane");
  const scoreEl = $("#rhythm-score");
  let score = 0;
  let active = false;
  let spawnTimer;

  $("#rhythm-start").addEventListener("click", () => {
    if (active) return;
    active = true;
    score = 0;
    scoreEl.textContent = "Score: 0";
    spawnTimer = setInterval(() => spawnPaw(lane, () => {
      score += 5;
      scoreEl.textContent = `Score: ${score}`;
    }), 900);
    setTimeout(async () => {
      clearInterval(spawnTimer);
      active = false;
      const stars = Math.min(5, Math.max(1, Math.round(score / 20)));
      await addGameResult({ type: "pizzicato", score, stars });
      showToast("Panda Pizzicato complete!");
      await refreshDashboard();
      renderGameCoach();
    }, 15000);
  });
}

function spawnPaw(lane, onHit) {
  const paw = document.createElement("div");
  paw.className = "paw";
  paw.textContent = "♪";
  paw.style.left = `${Math.random() * 80 + 5}%`;
  paw.style.top = "-40px";
  lane.appendChild(paw);

  let pos = -40;
  const drop = setInterval(() => {
    pos += 4;
    paw.style.top = `${pos}px`;
    if (pos > 120) {
      clearInterval(drop);
      paw.remove();
    }
  }, 16);

  paw.addEventListener("click", () => {
    onHit();
    paw.remove();
  });
}

async function setupQuest() {
  const today = dayKey(new Date());
  let storedDate = await getSetting("questDate", "");
  let items = await getSetting("questItems", []);
  let checks = await getSetting("questChecks", []);

  if (storedDate !== today || !Array.isArray(items) || items.length === 0) {
    items = generateQuestItems();
    checks = new Array(items.length).fill(false);
    storedDate = today;
    await setSetting("questDate", storedDate);
    await setSetting("questItems", items);
    await setSetting("questChecks", checks);
  }

  questState = { date: storedDate, items, checks };
  renderQuest();

  setInterval(async () => {
    const current = dayKey(new Date());
    if (current !== questState.date) {
      questState.date = current;
      questState.items = generateQuestItems();
      questState.checks = new Array(questState.items.length).fill(false);
      await setSetting("questDate", questState.date);
      await setSetting("questItems", questState.items);
      await setSetting("questChecks", questState.checks);
      renderQuest();
    }
  }, 60 * 60 * 1000);
}

function generateQuestItems() {
  const pool = [...QUEST_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 4);
}

function renderQuest() {
  const list = $("#quest-list");
  if (!list) return;
  list.innerHTML = "";
  questState.items.forEach((item, index) => {
    const li = document.createElement("li");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(questState.checks[index]);
    input.addEventListener("change", async () => {
      questState.checks[index] = input.checked;
      await setSetting("questChecks", questState.checks);
      if (questState.checks.every(Boolean)) {
        showToast("Quest complete! 🌈");
        if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
      }
    });
    li.appendChild(input);
    li.appendChild(document.createTextNode(` ${item}`));
    list.appendChild(li);
  });
}

function setupPracticeLogger() {
  $("#log-session").addEventListener("click", async () => {
    const minutesField = parseInt($("#minutes-input").value, 10);
    const minutes = minutesField || parseInt(prompt("How many minutes did you practice?"), 10);
    if (!minutes) return;
    const mood = $("#mood-select").value;
    const focus = parseInt($("#focus-range").value, 10);
    const rhythm = parseInt($("#rhythm-range").value, 10);
    const intonation = parseInt($("#intonation-range").value, 10);
    const tone = parseInt($("#tone-range").value, 10);
    const notes = $("#journal-notes").value.trim();
    const accuracy = averageAccuracy();

    await addSession({
      date: new Date().toISOString(),
      minutes,
      mood,
      focus,
      rhythm,
      intonation,
      tone,
      toneScore: liveMetrics.warmth,
      stabilityScore: liveMetrics.stability,
      dynamicsScore: liveMetrics.dynamics,
      vibratoScore: liveMetrics.vibrato,
      notes,
      accuracy,
    });
    $("#journal-notes").value = "";
    $("#minutes-input").value = "";
    showToast("Practice logged! 🌟");
    await refreshDashboard();
  });
}

function setupPracticeTimer() {
  const display = $("#practice-timer");
  const status = $("#timer-status");

  const updateDisplay = () => {
    const totalSeconds = Math.floor(practiceTimerElapsed / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    display.textContent = `${minutes}:${seconds}`;
  };

  const tick = () => {
    const now = Date.now();
    practiceTimerElapsed = now - practiceTimerStart;
    updateDisplay();
  };

  $("#timer-start").addEventListener("click", () => {
    if (practiceTimerRunning) return;
    practiceTimerRunning = true;
    practiceTimerStart = Date.now() - practiceTimerElapsed;
    tick();
    practiceTimerId = setInterval(tick, 500);
    requestWakeLock();
    status.textContent = "Practice in progress…";
  });

  $("#timer-pause").addEventListener("click", () => {
    if (!practiceTimerRunning) return;
    practiceTimerRunning = false;
    clearInterval(practiceTimerId);
    practiceTimerElapsed = Date.now() - practiceTimerStart;
    releaseWakeLock();
    status.textContent = "Paused. Take a breath.";
  });

  $("#timer-reset").addEventListener("click", () => {
    practiceTimerRunning = false;
    clearInterval(practiceTimerId);
    practiceTimerElapsed = 0;
    releaseWakeLock();
    updateDisplay();
    status.textContent = "Ready for practice.";
  });

  $("#timer-save").addEventListener("click", async () => {
    if (practiceTimerElapsed < 1000) {
      showToast("Timer is empty.");
      return;
    }
    const minutes = Math.max(1, Math.round(practiceTimerElapsed / 60000));
    const mood = $("#mood-select").value;
    const focus = parseInt($("#focus-range").value, 10);
    const rhythm = parseInt($("#rhythm-range").value, 10);
    const intonation = parseInt($("#intonation-range").value, 10);
    const tone = parseInt($("#tone-range").value, 10);
    const notes = $("#journal-notes").value.trim();
    const accuracy = averageAccuracy();
    await addSession({
      date: new Date().toISOString(),
      minutes,
      mood,
      focus,
      rhythm,
      intonation,
      tone,
      toneScore: liveMetrics.warmth,
      stabilityScore: liveMetrics.stability,
      dynamicsScore: liveMetrics.dynamics,
      vibratoScore: liveMetrics.vibrato,
      notes,
      accuracy,
    });
    practiceTimerRunning = false;
    clearInterval(practiceTimerId);
    practiceTimerElapsed = 0;
    releaseWakeLock();
    updateDisplay();
    status.textContent = "Session saved!";
    showToast("Timer session saved 🌟");
    await refreshDashboard();
  });

  updateDisplay();
}

function setupRecording() {
  const recordBtn = $("#start-record");
  let recorder;
  let chunks = [];
  let recordStart = 0;

  recordBtn.addEventListener("click", async () => {
    if (!("MediaRecorder" in window)) {
      showToast("Recording not supported on this device.");
      return;
    }
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      recordBtn.textContent = "Record + Analyze";
      return;
    }

    try {
      await ensureAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      recorder = new MediaRecorder(stream, { mimeType });
      chunks = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        await addRecording({
          date: new Date().toISOString(),
          blob,
          duration: Math.round((Date.now() - recordStart) / 1000),
        });
        stream.getTracks().forEach((t) => t.stop());
        await refreshDashboard();
        showToast("Recording saved to Analysis");
      };
      recordStart = Date.now();
      recorder.start();
      recordBtn.textContent = "Stop Recording";
      showToast("Recording... play your piece!");
    } catch (err) {
      console.error(err);
      showToast("Recording needs microphone access");
    }
  });
}

function averageAccuracy() {
  if (!coachAccuracySamples.length) return null;
  const sum = coachAccuracySamples.reduce((a, b) => a + b, 0);
  return Math.round((sum / coachAccuracySamples.length) * 100);
}

async function refreshDashboard() {
  const sessions = await getSessions();
  const games = await getGameResults();
  const recordings = await getRecordings();
  const songLogs = await getSongLogs();
  const stats = computeStats(sessions, games, recordings);
  $("#streak-count").textContent = `${stats.streak} days`;
  $("#week-minutes").textContent = `${stats.weekMinutes} min`;
  $("#focus-stars").textContent = `${calcFocusStars(sessions)}`;
  renderStickerShelf(stats);
  await updateGoalProgress(stats);
  await renderDailyPlan(sessions, games, songLogs);
  renderSongOfDay();
  await renderRepertoire();
  renderAnalysis();
  renderProgress();
  await renderRecordings();
}

function calcStreak(sessions) {
  const daySet = new Set(sessions.map((s) => dayKey(new Date(s.date))));
  if (!daySet.size) return 0;

  let cursor = startOfDay(new Date());
  let key = dayKey(cursor);
  if (!daySet.has(key)) {
    cursor = new Date(cursor.getTime() - 86400000);
    key = dayKey(cursor);
    if (!daySet.has(key)) return 0;
  }

  let streak = 0;
  while (daySet.has(key)) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
    key = dayKey(cursor);
  }
  return streak;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calcWeeklyMinutes(sessions) {
  const now = Date.now();
  return sessions
    .filter((s) => now - new Date(s.date).getTime() < 7 * 86400000)
    .reduce((sum, s) => sum + (s.minutes || 0), 0);
}

function calcFocusStars(sessions) {
  const total = sessions.reduce((sum, s) => sum + (s.focus || 0), 0);
  if (!sessions.length) return 0;
  return Math.round((total / sessions.length) * 2);
}

async function renderDailyPlan(sessions, games, songLogs) {
  const list = $("#daily-plan");
  if (!list) return;
  let goal = await getSetting("goalMinutes", 20);
  if (!goal || Number.isNaN(goal)) goal = 20;
  const focusPref = await getSetting("focusArea", "auto");
  const assignedSong = await getSetting("assignedSong", "auto");
  const dueSong = await getDueSong();
  const plan = generateDailyPlan(sessions, games, songLogs, goal, focusPref, assignedSong, dueSong);
  list.innerHTML = "";
  plan.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.appendChild(li);
  });
}

function generateDailyPlan(sessions, games, songLogs, goalMinutes, focusPref = "auto", assignedSong = "auto", dueSong = null) {
  const profile = computeSkillProfile(sessions, games, songLogs);
  const focusArea = focusPref !== "auto" ? focusPref : pickFocusArea(profile);
  const song = assignedSong !== "auto"
    ? SONG_LIBRARY.find((s) => s.id === assignedSong) || pickSongOfDay()
    : dueSong || pickSongOfDay();
  const game = focusArea === "rhythm"
    ? "Rhythm Dash"
    : focusArea === "intonation"
      ? "Pitch Quest"
      : focusArea === "bow"
        ? "Bow Hold Hero"
        : "Panda Pizzicato";

  const steps = [
    { label: "Warm-up: open strings + bow rainbows", minutes: 3 },
    { label: `Skill focus: ${focusAreaLabel(focusArea)}`, minutes: 4 },
    { label: `Song: ${song.title}`, minutes: 5 },
    { label: `Game boost: ${game}`, minutes: 3 },
    { label: "Cool down: long tones + stretch", minutes: 2 },
  ];

  const total = steps.reduce((sum, s) => sum + s.minutes, 0);
  const scale = Math.max(0.7, Math.min(1.4, goalMinutes / total));
  return steps.map((step) => `${step.label} (${Math.max(1, Math.round(step.minutes * scale))} min)`);
}

function focusAreaLabel(area) {
  if (area === "intonation") return "Intonation (in-tune fingers)";
  if (area === "pitch") return "Intonation (in-tune fingers)";
  if (area === "rhythm") return "Rhythm (steady beat)";
  if (area === "pattern") return "Rhythm patterns (steady beat)";
  if (area === "bow") return "Bow control (smooth sound)";
  if (area === "tone") return "Tone (beautiful sound)";
  if (area === "ear") return "Ear training (listening)";
  return "All-around balance";
}

function pickFocusArea(profile) {
  const entries = [
    ["intonation", profile.intonation],
    ["rhythm", profile.rhythm],
    ["bow", profile.bow],
    ["tone", profile.tone],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

async function renderSmartCoach(sessions, games, songLogs) {
  const summary = $("#ml-summary");
  const insights = $("#ml-insights");
  const grid = $("#skill-grid");
  if (!summary || !insights || !grid) return;

  const sessionData = sessions || await getSessions();
  const gameData = games || await getGameResults();
  const songData = songLogs || await getSongLogs();
  const profile = computeSkillProfile(sessionData, gameData, songData);
  const quality = sessionQualityModel(sessionData);
  const window = preferredPracticeWindow(sessionData);

  summary.innerHTML = `
    <div>Quality Cluster: <strong>${quality.label}</strong> ${quality.confidence}</div>
    <div>Focus Trend: <strong>${quality.trend}</strong></div>
    <div>Best Practice Window: <strong>${window}</strong></div>
  `;
  if (liveMetrics.stability) {
    summary.innerHTML += `
      <div>Live Tone Snapshot: <strong>${liveMetrics.stability}% stability</strong> • ${liveMetrics.warmth}% warmth</div>
    `;
  }

  const focusArea = pickFocusArea(profile);
  const spotlightTip = buildSpotlightTip(focusArea);
  const song = pickSongOfDay();
  insights.innerHTML = `
    <div>Coach Suggestion: ${spotlightTip}</div>
    <div>Song Match: ${song.title} • ${song.focus}</div>
    <div>Next Goal: ${profile.consistency >= 80 ? "Add 2 min to the daily goal." : "Keep the same goal and build consistency."}</div>
  `;

  grid.innerHTML = "";
  [
    { key: "intonation", label: "Intonation", value: profile.intonation },
    { key: "rhythm", label: "Rhythm", value: profile.rhythm },
    { key: "bow", label: "Bow Control", value: profile.bow },
    { key: "tone", label: "Tone", value: profile.tone },
    { key: "consistency", label: "Consistency", value: profile.consistency },
    { key: "repertoire", label: "Repertoire", value: profile.repertoire },
  ].forEach((item) => {
    const card = document.createElement("div");
    card.className = "skill-card";
    card.innerHTML = `
      <h4>${item.label}</h4>
      <div class="skill-meter"><span style="width:${item.value}%"></span></div>
      <div class="muted">${item.value}%</div>
    `;
    grid.appendChild(card);
  });
}

function buildSpotlightTip(area) {
  if (area === "intonation") return "Tune one string at a time and hold each note for 4 beats.";
  if (area === "rhythm") return "Clap the rhythm first, then play with the metronome.";
  if (area === "bow") return "Watch the bow lane and keep it straight like a train track.";
  if (area === "tone") return "Use slow bows and listen for a warm, steady sound.";
  return "Keep a balanced practice with songs + games.";
}

function addChatBubble(text, role = "coach") {
  const log = $("#chat-log");
  if (!log) return;
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

async function handleCoachChat() {
  const input = $("#chat-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  addChatBubble(text, "user");
  input.value = "";
  const response = await generateCoachResponse(text);
  addChatBubble(response, "coach");
  if (voiceEnabled) speak(response);
}

async function generateCoachResponse(text) {
  const lower = text.toLowerCase();
  const sessions = await getSessions();
  const games = await getGameResults();
  const songLogs = await getSongLogs();
  const profile = computeSkillProfile(sessions, games, songLogs);
  const focusArea = pickFocusArea(profile);
  const assignedFocus = await getSetting("focusArea", "auto");
  const assignedSong = await getSetting("assignedSong", "auto");
  const song = assignedSong !== "auto"
    ? SONG_LIBRARY.find((s) => s.id === assignedSong) || pickSongOfDay()
    : pickSongOfDay();

  if (lower.includes("bow")) {
    return "Try bowing in the middle lane with slow, even strokes. Imagine a train track and keep the bow straight.";
  }
  if (lower.includes("rhythm") || lower.includes("beat")) {
    return "Let’s clap the rhythm first, then play with the metronome. Keep your taps light and even.";
  }
  if (lower.includes("intonation") || lower.includes("tune")) {
    return "Play one note for 4 beats and listen for a centered sound. Tiny finger slides help find the sweet spot.";
  }
  if (lower.includes("song")) {
    return `A great pick is “${song.title}.” Start slow, then add sparkle as it feels easy.`;
  }
  if (lower.includes("tired") || lower.includes("break")) {
    return "That’s okay. Take a water break, roll your shoulders, and come back for a 2‑minute glow‑up bow.";
  }
  if (lower.includes("practice") || lower.includes("today") || lower.includes("plan")) {
    const area = assignedFocus !== "auto" ? assignedFocus : focusArea;
    return `Today’s focus is ${focusAreaLabel(area)}. Warm up, play ${song.title}, then finish with a fun game.`;
  }
  return "You’re doing great! Ask me about bowing, rhythm, intonation, or which song to play next.";
}

function computeSkillProfile(sessions, games, songLogs) {
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const safeGames = Array.isArray(games) ? games : [];
  const safeSongLogs = Array.isArray(songLogs) ? songLogs : [];
  const accuracyValues = safeSessions.map((s) => s.accuracy).filter((v) => typeof v === "number");
  const accuracyAvg = accuracyValues.length ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length : 0;
  const rhythmAvg = averageRating(safeSessions, "rhythm");
  const intonationAvg = averageRating(safeSessions, "intonation");
  const toneAvg = averageRating(safeSessions, "tone");
  const warmthAvg = averageMetric(safeSessions, "toneScore");
  const stabilityAvg = averageMetric(safeSessions, "stabilityScore");
  const dynamicsAvg = averageMetric(safeSessions, "dynamicsScore");

  const byType = safeGames.reduce((acc, g) => {
    acc[g.type] = acc[g.type] || [];
    acc[g.type].push(g);
    return acc;
  }, {});

  const bestPitch = Math.max(0, ...(byType.pitch || []).map((g) => g.score || 0));
  const bestRhythm = Math.max(0, ...(byType.rhythm || []).map((g) => g.score || 0));
  const bestPizzicato = Math.max(0, ...(byType.pizzicato || []).map((g) => g.score || 0));
  const bestBow = Math.max(0, ...(byType.bow || []).map((g) => g.score || 0));

  const intonationScore = blendScores([
    scaleScore(accuracyAvg, 100),
    scaleScore(bestPitch, 100),
    scaleScore((intonationAvg || 3) * 20, 100),
  ]);

  const rhythmScore = blendScores([
    scaleScore(bestRhythm, 80),
    scaleScore(bestPizzicato, 80),
    scaleScore((rhythmAvg || 3) * 20, 100),
  ]);

  const bowScore = blendScores([
    scaleScore(bestBow, 30),
    scaleScore((toneAvg || 3) * 20, 100),
    scaleScore(stabilityAvg || 0, 100),
  ]);

  const toneScore = blendScores([
    scaleScore((toneAvg || 3) * 20, 100),
    scaleScore(accuracyAvg, 100),
    scaleScore(warmthAvg || 0, 100),
    scaleScore(dynamicsAvg || 0, 100),
  ]);

  const streak = calcStreak(safeSessions);
  const consistencyScore = scaleScore(streak, 7);

  const uniqueSongs = new Set(safeSongLogs.map((s) => s.songId)).size;
  const repertoireScore = scaleScore(uniqueSongs, SONG_LIBRARY.length);

  return {
    intonation: intonationScore,
    rhythm: rhythmScore,
    bow: bowScore,
    tone: toneScore,
    consistency: consistencyScore,
    repertoire: repertoireScore,
  };
}

function averageRating(sessions, key) {
  const values = sessions.map((s) => s[key]).filter((v) => typeof v === "number");
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function averageMetric(sessions, key) {
  const values = sessions.map((s) => s[key]).filter((v) => typeof v === "number");
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function scaleScore(value, max) {
  if (!max || Number.isNaN(max)) return 0;
  return clampScore((value / max) * 100);
}

function blendScores(values) {
  const valid = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (!valid.length) return 0;
  return clampScore(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function preferredPracticeWindow(sessions) {
  if (!sessions.length) return "Anytime that feels calm";
  const buckets = new Array(6).fill(0);
  sessions.forEach((s) => {
    const date = new Date(s.date);
    const hour = date.getHours();
    const bucket = Math.min(5, Math.floor(hour / 4));
    buckets[bucket] += 1;
  });
  const best = buckets.indexOf(Math.max(...buckets));
  const start = best * 4;
  const end = start + 4;
  return `${start}:00–${end}:00`;
}

function sessionQualityModel(sessions) {
  const data = sessions
    .filter((s) => s.minutes)
    .map((s) => [
      Math.min(1, (s.minutes || 0) / 40),
      Math.min(1, (s.focus || 0) / 5),
      Math.min(1, (s.accuracy || 0) / 100),
    ]);
  if (data.length < 4) {
    return { label: "Learning mode", confidence: "", trend: "Growing" };
  }
  const { centroids, labels } = kMeans(data, 3, 10);
  const lastLabel = labels[labels.length - 1];
  const scores = centroids.map((c) => c.reduce((a, b) => a + b, 0));
  const order = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => a.score - b.score);
  const labelMap = {};
  labelMap[order[0].index] = "Growing";
  labelMap[order[1].index] = "Steady";
  labelMap[order[2].index] = "High Focus";
  const label = labelMap[lastLabel] || "Steady";
  const confidence = data.length > 8 ? "• strong data" : "• building data";

  const recent = sessions.slice(-3).map((s) => s.focus || 0);
  const trend = recent.length >= 2 && recent[recent.length - 1] >= recent[0] ? "Upward" : "Steady";
  return { label, confidence, trend };
}

function kMeans(data, k, iterations) {
  const centroids = [];
  const labels = new Array(data.length).fill(0);
  for (let i = 0; i < k; i++) {
    centroids.push([...data[Math.floor(Math.random() * data.length)]]);
  }
  for (let iter = 0; iter < iterations; iter++) {
    data.forEach((point, idx) => {
      let best = 0;
      let bestDist = Infinity;
      centroids.forEach((centroid, cIdx) => {
        const dist = Math.sqrt(point.reduce((sum, val, i) => sum + (val - centroid[i]) ** 2, 0));
        if (dist < bestDist) {
          bestDist = dist;
          best = cIdx;
        }
      });
      labels[idx] = best;
    });
    for (let c = 0; c < k; c++) {
      const members = data.filter((_, idx) => labels[idx] === c);
      if (!members.length) continue;
      const next = new Array(data[0].length).fill(0);
      members.forEach((point) => {
        point.forEach((val, i) => {
          next[i] += val;
        });
      });
      centroids[c] = next.map((sum) => sum / members.length);
    }
  }
  return { centroids, labels };
}

async function renderAnalysis() {
  const chart = $("#analysis-chart");
  if (!chart) return;
  const ctx = chart.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = chart.clientWidth || chart.width;
  const height = chart.clientHeight || chart.height;
  chart.width = width * ratio;
  chart.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff5ec";
  ctx.fillRect(0, 0, width, height);

  const sessions = await getSessions();
  const games = await getGameResults();
  const recordings = await getRecordings();
  const songLogs = await getSongLogs();
  const stats = computeStats(sessions, games, recordings);

  const data = tunerHistory.slice(-40);
  if (data.length) {
    ctx.strokeStyle = "#ff5c8a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = (i / (data.length - 1)) * (width - 40) + 20;
      const y = height / 2 - (d.cents / 50) * 60;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  } else {
    const last7 = sessions
      .filter((s) => Date.now() - new Date(s.date).getTime() < 7 * 86400000)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!last7.length) {
      ctx.fillStyle = "#7a4a36";
      ctx.fillText("Log a session to see weekly progress.", 20, 100);
    } else {
      const max = Math.max(...last7.map((s) => s.minutes || 1));
      const barWidth = (width - 40) / last7.length;
      last7.forEach((session, i) => {
        const value = session.minutes || 0;
        const barHeight = (value / max) * 120;
        const x = 20 + i * barWidth + 6;
        const y = height - 20 - barHeight;
        ctx.fillStyle = "#4cc9f0";
        ctx.fillRect(x, y, barWidth - 12, barHeight);
      });
    }
  }

  const statsEl = $("#analysis-stats");
  const accuracy = averageAccuracy();
  statsEl.innerHTML = `
    <div>Accuracy: <strong>${accuracy !== null ? accuracy + "%" : "—"}</strong></div>
    <div>Week Minutes: <strong>${stats.weekMinutes}</strong></div>
    <div>Streak: <strong>${stats.streak} days</strong></div>
  `;

  const summaryEl = $("#analysis-summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div>Best Pitch Quest: <strong>${stats.bestPitch || "—"}</strong></div>
      <div>Best Bow Hold: <strong>${stats.bestBow || "—"}s</strong></div>
      <div>Recordings: <strong>${stats.totalRecordings}</strong></div>
    `;
  }

  await renderSmartCoach(sessions, games, songLogs);
}

async function renderRecordings() {
  const list = $("#recordings-list");
  const recordings = await getRecordings();
  list.innerHTML = "";
  if (!recordings.length) {
    list.textContent = "No recordings yet. Record a session to see it here.";
    return;
  }
  recordings.slice(-5).reverse().forEach((rec) => {
    const item = document.createElement("div");
    item.className = "recording-item";
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = URL.createObjectURL(rec.blob);
    const duration = rec.duration ? `${rec.duration}s` : "";
    item.innerHTML = `<div><strong>${new Date(rec.date).toLocaleString()}</strong> <span class="muted">${duration}</span></div>`;
    item.appendChild(audio);
    list.appendChild(item);
  });
}

async function renderProgress() {
  const garden = $("#progress-garden");
  const summary = $("#weekly-summary");
  const highlights = $("#game-highlights");
  const sessions = await getSessions();
  const games = await getGameResults();
  const recordings = await getRecordings();
  const songLogs = await getSongLogs();
  const stats = computeStats(sessions, games, recordings);
  garden.innerHTML = "";
  const last7 = sessions
    .filter((s) => Date.now() - new Date(s.date).getTime() < 7 * 86400000)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!last7.length) {
    garden.textContent = "Plant a practice seed by logging a session!";
  } else {
    last7.forEach((session) => {
      const seed = document.createElement("div");
      seed.className = "seed";
      seed.innerHTML = `<span>${new Date(session.date).toLocaleDateString()}</span><span>${session.minutes || 0} min</span>`;
      garden.appendChild(seed);
    });
  }

  const total = stats.totalMinutes;
  const recentGames = games.filter((g) => Date.now() - new Date(g.date).getTime() < 7 * 86400000);
  const gameStars = recentGames.reduce((sum, g) => sum + (g.stars || 0), 0);
  const avg = sessions.length ? Math.round(total / sessions.length) : 0;
  summary.innerHTML = `
    <div>Total Practice: <strong>${total} min</strong></div>
    <div>Average Session: <strong>${avg} min</strong></div>
    <div>Streak: <strong>${calcStreak(sessions)} days</strong></div>
    <div>Game Stars (7d): <strong>${gameStars}</strong></div>
    <div>Song Plays (7d): <strong>${songLogs.filter((s) => Date.now() - new Date(s.date).getTime() < 7 * 86400000).length}</strong></div>
  `;

  if (highlights) {
    if (!games.length) {
      highlights.textContent = "Play a game to see highlights.";
    } else {
      highlights.innerHTML = `
        <div>Best Pitch Quest: <strong>${stats.bestPitch || "—"}</strong></div>
        <div>Best Rhythm Dash: <strong>${stats.bestRhythm || "—"}</strong></div>
        <div>Best Panda Pizzicato: <strong>${stats.bestPizzicato || "—"}</strong></div>
        <div>Best Bow Hold: <strong>${stats.bestBow || "—"}s</strong></div>
        <div>Best Ear Trainer: <strong>${stats.bestEar || "—"}</strong></div>
        <div>Best Rhythm Painter: <strong>${stats.bestPattern || "—"}</strong></div>
      `;
    }
  }

  renderLearningPath(stats, songLogs);
}

function renderLearningPath(stats, songLogs) {
  const grid = $("#learning-path");
  if (!grid) return;
  grid.innerHTML = "";
  LEARNING_PATH.forEach((step, index) => {
    const unlocked = step.requirement(stats, songLogs);
    const card = document.createElement("div");
    card.className = `path-card ${unlocked ? "unlocked" : "locked"}`;
    card.innerHTML = `
      <div class="path-title">${index + 1}. ${step.title}</div>
      <div class="muted">${step.detail}</div>
      <div class="path-status">${unlocked ? "Unlocked ✨" : "Locked"}</div>
    `;
    grid.appendChild(card);
  });
}

function setupReminderTimer() {
  setInterval(() => {
    if (!reminderTime) return;
    const [hour, minute] = reminderTime.split(":").map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;
    const now = new Date();
    const key = now.toDateString();
    if (now.getHours() === hour && now.getMinutes() === minute && lastReminderDay !== key) {
      showToast("Practice time! Your violin is waiting 🎻");
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Practice time!", { body: "Your violin is waiting 🎻" });
      }
      lastReminderDay = key;
    }
  }, 30000);
}

function setupParent() {
  $("#unlock-parent").addEventListener("click", unlockParent);
  $("#lock-parent").addEventListener("click", () => {
    $("#parent-dashboard").classList.add("hidden");
    $("#parent-lock").style.display = "grid";
  });
  $("#save-parent-settings").addEventListener("click", saveParentSettings);
  $("#export-data").addEventListener("click", exportData);
  $("#share-data").addEventListener("click", exportData);
  $("#import-data").addEventListener("change", importData);
  $("#clear-data").addEventListener("click", clearAllData);

  loadParentSettings();
}

async function unlockParent() {
  const pin = $("#parent-pin").value;
  const stored = await getSetting("parentPin", "1234");
  if (pin === stored) {
    $("#parent-dashboard").classList.remove("hidden");
    $("#parent-lock").style.display = "none";
    $("#parent-pin").value = "";
    renderParentInsights();
  } else {
    showToast("Incorrect PIN");
  }
}

async function loadParentSettings() {
  const goal = await getSetting("goalMinutes", 20);
  $("#goal-minutes").value = goal;
  const reminder = await getSetting("reminderTime", "");
  reminderTime = reminder;
  $("#reminder-time").value = reminder;
  const focusArea = await getSetting("focusArea", "auto");
  $("#focus-area").value = focusArea;
  const assignedSong = await getSetting("assignedSong", "auto");
  await populateAssignedSongOptions();
  $("#assigned-song").value = assignedSong;
}

async function saveParentSettings() {
  const goal = parseInt($("#goal-minutes").value, 10);
  const reminder = $("#reminder-time").value;
  const focusArea = $("#focus-area").value;
  const assignedSong = $("#assigned-song").value;
  const newPin = $("#parent-pin-set").value.trim();
  await setSetting("goalMinutes", goal);
  await setSetting("reminderTime", reminder);
  await setSetting("focusArea", focusArea);
  await setSetting("assignedSong", assignedSong);
  reminderTime = reminder;
  if (newPin) await setSetting("parentPin", newPin);
  if (reminder && "Notification" in window && Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch (err) { /* ignore */ }
  }
  $("#parent-pin-set").value = "";
  showToast("Parent settings saved");
  await refreshDashboard();
}

async function renderParentInsights() {
  const sessions = await getSessions();
  const games = await getGameResults();
  const recordings = await getRecordings();
  const songLogs = await getSongLogs();
  const stats = computeStats(sessions, games, recordings);
  let goal = await getSetting("goalMinutes", 20);
  if (!goal || Number.isNaN(goal)) goal = 20;
  const avgFocus = sessions.length ? (sessions.reduce((sum, s) => sum + (s.focus || 0), 0) / sessions.length).toFixed(1) : "—";
  const accuracy = sessions.map((s) => s.accuracy).filter((v) => typeof v === "number");
  const avgAccuracy = accuracy.length ? Math.round(accuracy.reduce((a, b) => a + b, 0) / accuracy.length) : "—";
  $("#parent-insights").innerHTML = `
    <div>Average Focus: <strong>${avgFocus}</strong></div>
    <div>Average Accuracy: <strong>${avgAccuracy}%</strong></div>
    <div>Sessions: <strong>${sessions.length}</strong></div>
    <div>Games Played: <strong>${games.length}</strong></div>
    <div>Songs Practiced: <strong>${songLogs.length}</strong></div>
    <div>Today: <strong>${stats.todayMinutes} / ${goal} min</strong></div>
  `;
}

async function exportData() {
  const sessions = await getSessions();
  const games = await getGameResults();
  const recordings = await getRecordings();
  const songLogs = await getSongLogs();
  const settings = await getAllSettings();
  const payload = { sessions, games, songLogs, recordings: recordings.map((r) => ({ ...r, blob: undefined })), settings };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const file = new File([blob], "emerson-violin-data.json", { type: "application/json" });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Emerson Violin Backup" });
      showToast("Shared backup");
      return;
    } catch (err) {
      console.warn("Share failed", err);
    }
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "emerson-violin-data.json";
  link.click();
  showToast("Data exported");
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const db = await dbPromise;
    const tx = db.transaction(["sessions", "games", "songLogs", "settings"], "readwrite");
    if (Array.isArray(data.sessions)) {
      const store = tx.objectStore("sessions");
      data.sessions.forEach((s) => {
        const { id, ...rest } = s;
        store.add(rest);
      });
    }
    if (Array.isArray(data.games)) {
      const store = tx.objectStore("games");
      data.games.forEach((g) => {
        const { id, ...rest } = g;
        store.add(rest);
      });
    }
    if (Array.isArray(data.songLogs)) {
      const store = tx.objectStore("songLogs");
      data.songLogs.forEach((log) => {
        const { id, ...rest } = log;
        store.add(rest);
      });
    }
    if (data.settings && typeof data.settings === "object") {
      const store = tx.objectStore("settings");
      Object.entries(data.settings).forEach(([key, value]) => {
        store.put({ key, value });
      });
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    showToast("Backup imported");
    await loadParentSettings();
    await refreshDashboard();
  } catch (err) {
    console.error(err);
    showToast("Import failed");
  } finally {
    event.target.value = "";
  }
}

async function clearAllData() {
  if (!confirm("Clear all data on this device?")) return;
  try {
    const db = await dbPromise;
    db.close();
  } catch (err) {
    /* ignore */
  }
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  showToast("Data cleared");
  setTimeout(() => location.reload(), 500);
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.1;
  speechSynthesis.speak(utter);
}

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("recordings")) {
        db.createObjectStore("recordings", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("games")) {
        db.createObjectStore("games", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("songLogs")) {
        db.createObjectStore("songLogs", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addSession(session) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readwrite");
    const store = tx.objectStore("sessions");
    const request = store.add(session);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSessions() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sessions", "readonly");
    const store = tx.objectStore("sessions");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function addGameResult(result) {
  const db = await dbPromise;
  const payload = { ...result, date: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction("games", "readwrite");
    const store = tx.objectStore("games");
    const request = store.add(payload);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getGameResults() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("games", "readonly");
    const store = tx.objectStore("games");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function addSongLog(log) {
  const db = await dbPromise;
  const payload = { ...log, date: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction("songLogs", "readwrite");
    const store = tx.objectStore("songLogs");
    const request = store.add(payload);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSongLogs() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("songLogs", "readonly");
    const store = tx.objectStore("songLogs");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function addRecording(recording) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", "readwrite");
    const store = tx.objectStore("recordings");
    const request = store.add(recording);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getRecordings() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", "readonly");
    const store = tx.objectStore("recordings");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function getSetting(key, fallback) {
  const db = await dbPromise;
  return new Promise((resolve) => {
    const tx = db.transaction("settings", "readonly");
    const store = tx.objectStore("settings");
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ? request.result.value : fallback);
    request.onerror = () => resolve(fallback);
  });
}

async function setSetting(key, value) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("settings", "readwrite");
    const store = tx.objectStore("settings");
    const request = store.put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getAllSettings() {
  const db = await dbPromise;
  return new Promise((resolve) => {
    const tx = db.transaction("settings", "readonly");
    const store = tx.objectStore("settings");
    const request = store.getAll();
    request.onsuccess = () => {
      const entries = request.result || [];
      resolve(entries.reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {}));
    };
    request.onerror = () => resolve({});
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("SW failed", err));
  }
}

async function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch (err) {
      console.warn("Persistence request failed", err);
    }
  }
}
