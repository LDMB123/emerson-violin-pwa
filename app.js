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
let bowMotionWobble = 0;
let bowMotionListener;
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
let storyStep = 0;
let storyAnswers = {};
let storySong = null;
let storyPlaybackNodes = [];
let storyPlaybackTimeout;
let lessonState = {
  lessonId: null,
  stepIndex: 0,
  running: false,
  remainingSec: 0,
  totalSec: 0,
  elapsedSec: 0,
  timerId: null,
};
let bowCoachActive = false;
let bowCoachStart = 0;
let bowCoachAnimation;
let postureStream = null;
let postureTipTimer;
let postureTipIndex = 0;
let guidedMode = false;
let guidedActive = false;
let guidedIndex = 0;
let guidedSections = [];
let guidedRatings = [];
let songState = {
  selectedId: null,
  tempo: 84,
  guide: true,
  click: true,
  drone: false,
  loop: false,
  playing: false,
  previewing: false,
  guidedMode: false,
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
let fingerTarget = "A4";
let fingerAuto = true;
let fingerTolerance = 18;
let fingerHoldStart = 0;
let fingerHold = 0;
let fingerStreak = 0;
let fingerHoldGoal = 2;
let fingerHoldRewarded = false;
let pandaEnabled = true;
let pandaBubbleTimer;
let lastPandaMessageAt = 0;
const PANDA_COOLDOWN_MS = 9000;
let coachFocus = "intonation";
let pitchSession = {
  active: false,
  mode: "single",
  roundDuration: 4,
  totalRounds: 1,
  round: 0,
  streak: 0,
  combo: 1,
  score: 0,
  hits: 0,
  misses: 0,
  autoStop: false,
  timerId: null,
  roundTimerId: null,
  ladderIndex: 0,
};
let rhythmSession = {
  active: false,
  mode: "steady",
  duration: 30,
  timerId: null,
  score: 0,
  combo: 1,
  streak: 0,
  hits: 0,
  perfect: 0,
  great: 0,
  ok: 0,
  misses: 0,
};
let memorySession = {
  level: 1,
  lives: 3,
  streak: 0,
  hintUsed: false,
};
let bowSession = {
  level: 1,
  goal: 6,
  streak: 0,
  best: 0,
  breathTimer: null,
  breathPhase: 0,
  motionEnabled: false,
};
let earSession = {
  level: 1,
  lives: 3,
  streak: 0,
  round: 0,
  mode: "single",
  targetSequence: [],
  input: [],
};
let patternSession = {
  level: 1,
  tempo: 96,
  combo: 1,
  streak: 0,
  listening: false,
};
let pizzicatoSession = {
  active: false,
  level: 1,
  duration: 18,
  speed: 1,
  timerId: null,
  spawnId: null,
  score: 0,
  combo: 1,
  streak: 0,
  misses: 0,
};
let crossingSession = {
  active: false,
  tempo: 88,
  duration: 30,
  sequence: [],
  index: 0,
  score: 0,
  streak: 0,
  combo: 1,
  misses: 0,
  beatTimer: null,
  roundTimer: null,
  lastBeat: 0,
  awaiting: false,
};

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
const FINGER_TARGETS = ["A4", "B4", "C#5", "D5", "E5", "F#5", "G5"];
const DEFAULT_GAME_PROFILES = {
  pitch: { level: 1, bestScore: 0, bestStreak: 0 },
  rhythm: { level: 1, bestScore: 0, bestStreak: 0 },
  memory: { level: 1, bestScore: 0, bestStreak: 0 },
  bow: { level: 1, bestScore: 0, bestStreak: 0 },
  ear: { level: 1, bestScore: 0, bestStreak: 0 },
  pattern: { level: 1, bestScore: 0, bestStreak: 0 },
  pizzicato: { level: 1, bestScore: 0, bestStreak: 0 },
  crossing: { level: 1, bestScore: 0, bestStreak: 0 },
};
let gameProfiles = { ...DEFAULT_GAME_PROFILES };

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
  "Finger Guardian hold (2 min)",
  "String Crossing Quest (3 min)",
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
    id: "red-panda-parade",
    title: "Red Panda Parade",
    level: "beginner",
    bpm: 96,
    key: "A major",
    strings: ["A", "E"],
    focus: "Happy steps and confident fingers",
    notes: [
      ["A4", 1], ["B4", 1], ["C#5", 1], ["D5", 1], ["E5", 2],
      ["E5", 1], ["D5", 1], ["C#5", 1], ["B4", 1], ["A4", 2],
      ["A4", 1], ["C#5", 1], ["E5", 1], ["D5", 1], ["C#5", 2],
      ["B4", 1], ["A4", 1], ["A4", 2],
    ],
    tips: ["March the beat with your feet.", "Lift each finger lightly and land softly."],
  },
  {
    id: "starlight-rocket",
    title: "Starlight Rocket",
    level: "early",
    bpm: 100,
    key: "D major",
    strings: ["D", "A"],
    focus: "Rocket rhythms and string confidence",
    notes: [
      ["D4", 1], ["E4", 1], ["F#4", 1], ["G4", 1], ["A4", 2],
      ["A4", 1], ["F#4", 1], ["E4", 1], ["D4", 1], ["D4", 2],
      ["E4", 1], ["F#4", 1], ["G4", 1], ["A4", 1], ["B4", 1], ["A4", 1], ["F#4", 2],
      ["D4", 4],
    ],
    tips: ["Imagine the rocket lifting off on the long note.", "Keep your bow straight like a rocket path."],
  },
  {
    id: "forest-fireflies",
    title: "Forest Fireflies",
    level: "beginner",
    bpm: 84,
    key: "G major",
    strings: ["G", "D"],
    focus: "Glowy tone and gentle bow",
    notes: [
      ["G3", 1], ["B3", 1], ["D4", 2],
      ["D4", 1], ["E4", 1], ["D4", 2],
      ["G3", 1], ["A3", 1], ["B3", 2],
      ["G3", 2], ["D4", 2],
    ],
    tips: ["Let the bow glide slowly.", "Listen for a soft shimmer on G and D."],
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

const STORY_QUESTIONS = [
  {
    id: "mood",
    question: "What kind of song mood do you want?",
    options: ["Happy", "Calm", "Brave", "Spooky"],
  },
  {
    id: "place",
    question: "Where does your song adventure happen?",
    options: ["Forest", "Ocean", "Space", "Castle"],
  },
  {
    id: "friend",
    question: "Who is your music friend today?",
    options: ["Red Panda", "Unicorn", "Dragon", "Robot"],
  },
  {
    id: "tempo",
    question: "How fast should the song go?",
    options: ["Slow", "Medium", "Fast"],
  },
];

const POSTURE_TIPS = [
  "Tall spine like a balloon string.",
  "Relax shoulders: melt like ice cream.",
  "Violin level: like a shelf.",
  "Bow arm floating like a cloud.",
  "Chin rest gentle, no squeezing.",
];

const LESSON_LIBRARY = [
  {
    id: "warmup-wizard",
    title: "Warmup Wizard",
    focus: "Posture + open strings + calm bow",
    steps: [
      { text: "Stretch shoulders + breathe (1 min)", minutes: 1 },
      { text: "Open strings G-D-A-E (2 min)", minutes: 2, tool: "tuner" },
      { text: "Bowing rainbows on A string (2 min)", minutes: 2 },
      { text: "Left-hand spider taps (2 min)", minutes: 2 },
      { text: "Long tone finish (1 min)", minutes: 1 },
    ],
  },
  {
    id: "tone-builder",
    title: "Tone Builder",
    focus: "Warm tone + straight bow",
    steps: [
      { text: "Bow lane check (1 min)", minutes: 1 },
      { text: "Open string long bows (3 min)", minutes: 3, tool: "trainer" },
      { text: "Crescendo / diminuendo (2 min)", minutes: 2 },
      { text: "Finish with favorite note (1 min)", minutes: 1 },
    ],
  },
  {
    id: "intonation-lab",
    title: "Intonation Lab",
    focus: "Targeted pitch accuracy",
    steps: [
      { text: "Tune A string (1 min)", minutes: 1, tool: "tuner" },
      { text: "Pitch Quest practice (3 min)", minutes: 3, tool: "games" },
      { text: "Slow song notes (3 min)", minutes: 3, tool: "songs" },
      { text: "Celebrate with a perfect A (1 min)", minutes: 1 },
    ],
  },
  {
    id: "rhythm-explorer",
    title: "Rhythm Explorer",
    focus: "Steady beat + patterns",
    steps: [
      { text: "Clap steady beat (1 min)", minutes: 1 },
      { text: "Rhythm Dash (3 min)", minutes: 3, tool: "games" },
      { text: "Rhythm Painter (3 min)", minutes: 3, tool: "games" },
      { text: "Play a song with metronome (2 min)", minutes: 2, tool: "songs" },
    ],
  },
  {
    id: "technique-lab",
    title: "Technique Lab",
    focus: "Bow + fingers",
    steps: [
      { text: "Straight bow check (1 min)", minutes: 1 },
      { text: "String crossings G-D-A-E (2 min)", minutes: 2 },
      { text: "Left-hand spider taps (2 min)", minutes: 2 },
      { text: "Bow Hold Hero (2 min)", minutes: 2, tool: "games" },
    ],
  },
  {
    id: "song-artist",
    title: "Song Artist",
    focus: "Song expression + memory",
    steps: [
      { text: "Pick a favorite song (1 min)", minutes: 1, tool: "songs" },
      { text: "Play along with guide (4 min)", minutes: 4, tool: "songs" },
      { text: "Note Memory game (2 min)", minutes: 2, tool: "games" },
      { text: "Perform for the panda (1 min)", minutes: 1 },
    ],
  },
  {
    id: "posture-pro",
    title: "Posture Pro",
    focus: "Strong setup + relaxed shoulders",
    steps: [
      { text: "Mirror check: tall spine (1 min)", minutes: 1, tool: "trainer" },
      { text: "Bow hold check (2 min)", minutes: 2, tool: "games" },
      { text: "Open strings with calm breath (2 min)", minutes: 2, tool: "tuner" },
      { text: "Celebrate with panda stretch (1 min)", minutes: 1 },
    ],
  },
  {
    id: "string-crossing",
    title: "String Crossing Quest",
    focus: "Smooth elbow motion + level bow",
    steps: [
      { text: "Slow crossings G-D-A-E (2 min)", minutes: 2 },
      { text: "String Crossing Quest game (3 min)", minutes: 3, tool: "games" },
      { text: "Lightly Row crossings (3 min)", minutes: 3, tool: "songs" },
      { text: "Finish with straight bow lanes (1 min)", minutes: 1 },
    ],
  },
  {
    id: "expression-spark",
    title: "Expression Spark",
    focus: "Storytelling + dynamic shape",
    steps: [
      { text: "Whisper to loud bows (2 min)", minutes: 2, tool: "trainer" },
      { text: "Play a song with emotion (3 min)", minutes: 3, tool: "songs" },
      { text: "Record a tiny performance (2 min)", minutes: 2, tool: "analysis" },
      { text: "Share your favorite moment (1 min)", minutes: 1 },
    ],
  },
];

const COACH_FOCUS_OPTIONS = {
  intonation: {
    title: "Intonation Explorer",
    desc: "Find the sweet spot on each finger. Use Finger Guardian and slow bows.",
    tool: "coach",
  },
  rhythm: {
    title: "Rhythm Ranger",
    desc: "Clap first, then tap the beat with Rhythm Dash or Crossing Quest.",
    tool: "games",
  },
  tone: {
    title: "Tone Glow",
    desc: "Warm, steady sound with slow bows and tall posture.",
    tool: "trainer",
  },
  bow: {
    title: "Bowing Master",
    desc: "Keep the bow straight and even. Try Bow Hold Hero + Bowing Coach.",
    tool: "trainer",
  },
  expression: {
    title: "Song Storyteller",
    desc: "Shape phrases and add sparkle. Play a song with guided mode.",
    tool: "songs",
  },
};

const LEVEL_REWARDS = {
  2: "Panda Sparkle Badge",
  3: "Golden Bow Sticker",
  4: "Rhythm Crown",
  5: "Songbird Cape",
  6: "Brave Performer Medal",
  7: "Panda Maestro Title",
};

const ACHIEVEMENTS = [
  {
    id: "first-game",
    title: "First Game Win",
    desc: "Complete your first game.",
    check: (stats) => stats.totalGames >= 1,
  },
  {
    id: "song-starter",
    title: "Song Starter",
    desc: "Play along with 1 song.",
    check: (_stats, _sessions, _games, songLogs) => songLogs.length >= 1,
  },
  {
    id: "practice-brave",
    title: "Practice Brave",
    desc: "Log 5 practice sessions.",
    check: (stats) => stats.totalSessions >= 5,
  },
  {
    id: "streak-3",
    title: "3-Day Streak",
    desc: "Practice 3 days in a row.",
    check: (stats) => stats.streak >= 3,
  },
  {
    id: "ear-explorer",
    title: "Ear Explorer",
    desc: "Score 15+ in Ear Trainer.",
    check: (stats) => stats.bestEar >= 15,
  },
  {
    id: "rhythm-ranger",
    title: "Rhythm Ranger",
    desc: "Score 40+ in Rhythm Dash or Rhythm Painter.",
    check: (stats) => stats.bestRhythm >= 40 || stats.bestPattern >= 40,
  },
  {
    id: "intonation-star",
    title: "Intonation Star",
    desc: "Average accuracy 80%+.",
    check: (stats) => (stats.accuracyAvg || 0) >= 80,
  },
  {
    id: "song-collector",
    title: "Song Collector",
    desc: "Play along with 5 different songs.",
    check: (_stats, _sessions, _games, songLogs) => new Set(songLogs.map((s) => s.songId)).size >= 5,
  },
  {
    id: "panda-performer",
    title: "Panda Performer",
    desc: "Practice 120 total minutes.",
    check: (stats) => stats.totalMinutes >= 120,
  },
  {
    id: "recording-star",
    title: "Studio Star",
    desc: "Make your first recording.",
    check: (stats) => stats.totalRecordings >= 1,
  },
  {
    id: "story-maker",
    title: "Story Maker",
    desc: "Create your first story song.",
    check: (_stats, _sessions, _games, _songLogs, customSongs) => customSongs.length >= 1,
  },
  {
    id: "story-hero",
    title: "Story Hero",
    desc: "Create 3 story songs.",
    check: (_stats, _sessions, _games, _songLogs, customSongs) => customSongs.length >= 3,
  },
];

const DB_NAME = "emerson-violin";
const DB_VERSION = 4;
const dbPromise = openDB();

init();

async function init() {
  setupNavigation();
  setupConnectivity();
  setupInstallTip();
  setupLifecycle();
  setupCoach();
  setupLessonStudio();
  setupTuner();
  setupMetronome();
  setupBowingCoach();
  setupPostureMirror();
  setupRhythmGame();
  setupPracticeLogger();
  await setupQuest();
  setupPracticeTimer();
  await setupSongs();
  await loadGameProfiles();
  setupGames();
  setupRewards();
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
  highlightPitchChips();
}

async function loadGameProfiles() {
  const stored = await getSetting("gameProfiles", null);
  gameProfiles = {
    ...DEFAULT_GAME_PROFILES,
    ...(stored && typeof stored === "object" ? stored : {}),
  };
  syncGameProfileUI();
}

function getGameProfile(id) {
  return gameProfiles[id] || { level: 1, bestScore: 0, bestStreak: 0 };
}

function updateGameProfile(id, patch) {
  const current = getGameProfile(id);
  gameProfiles[id] = { ...current, ...patch };
  setSetting("gameProfiles", gameProfiles);
  updateGameProfileUI(id);
}

function updateGameProfileUI(id) {
  const profile = getGameProfile(id);
  const map = {
    pitch: "#pitch-level",
    rhythm: "#rhythm-level",
    memory: "#memory-level",
    bow: "#bow-level",
    ear: "#ear-level",
    pattern: "#pattern-level",
    pizzicato: "#pizzicato-level",
    crossing: "#crossing-level",
  };
  const el = map[id] ? document.querySelector(map[id]) : null;
  if (el) el.textContent = `${profile.level}`;
}

function syncGameProfileUI() {
  Object.keys(DEFAULT_GAME_PROFILES).forEach((id) => updateGameProfileUI(id));
}

function highlightPitchChips() {
  const chips = [
    ...$$(".pitch-chip"),
    ...$$("#view-tuner .chip"),
    ...$$("#view-coach .chip"),
  ];
  chips.forEach((chip) => {
    const target = chip.dataset.target;
    if (!target) return;
    chip.classList.toggle("active", target === currentTarget);
  });
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
  const bestCrossing = Math.max(0, ...(byType.crossing || []).map((g) => g.score || 0));

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
    bestCrossing,
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
      stopStoryPlayback();
      stopBowingCoach();
      stopPostureCamera(true);
      stopActiveGames(true);
      releaseWakeLock();
    }
  });
  window.addEventListener("pagehide", () => {
    stopTuner();
    stopSongPlayback(false);
    stopStoryPlayback();
    stopBowingCoach();
    stopPostureCamera(true);
    stopActiveGames(true);
    releaseWakeLock();
  });
}

function setupNavigation() {
  const buttons = $$("[data-nav]");
  const tabButtons = $$(".tab-bar [data-nav]");
  const tabTargets = new Set(tabButtons.map((btn) => btn.dataset.nav));
  const views = $$(".view");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.nav;
      const activeTarget = tabTargets.has(target) ? target : "more";
      tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.nav === activeTarget));
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

  setupPandaCoach();
  setupFingerGuardian();
  setupCoachFocus();

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

function setupCoachFocus() {
  const focusGrid = $("#coach-focus-grid");
  const startBtn = $("#coach-focus-start");
  const nextBtn = $("#coach-focus-next");
  const goBtn = $("#coach-focus-go");
  const toolBtn = $("#coach-focus-tool");
  if (focusGrid) {
    focusGrid.querySelectorAll(".focus-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        setCoachFocus(chip.dataset.focus || "intonation");
      });
    });
  }
  if (startBtn) startBtn.addEventListener("click", () => startCoachFocus(true));
  if (nextBtn) nextBtn.addEventListener("click", () => cycleCoachFocus());
  if (goBtn) goBtn.addEventListener("click", () => startCoachFocus(true));
  if (toolBtn) toolBtn.addEventListener("click", () => startCoachFocus(false));

  setCoachFocus(coachFocus);
}

function setCoachFocus(focus) {
  coachFocus = COACH_FOCUS_OPTIONS[focus] ? focus : "intonation";
  const data = COACH_FOCUS_OPTIONS[coachFocus];
  const title = $("#coach-focus-title");
  const desc = $("#coach-focus-desc");
  if (title) title.textContent = data.title;
  if (desc) desc.textContent = data.desc;
  $$(".focus-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.focus === coachFocus);
  });
}

function cycleCoachFocus() {
  const keys = Object.keys(COACH_FOCUS_OPTIONS);
  const idx = Math.max(0, keys.indexOf(coachFocus));
  const next = keys[(idx + 1) % keys.length];
  setCoachFocus(next);
  pandaSay(`Let’s try ${COACH_FOCUS_OPTIONS[next].title}!`, "encourage", true);
}

function startCoachFocus(run = true) {
  const data = COACH_FOCUS_OPTIONS[coachFocus];
  if (!data) return;
  navigateToView(data.tool);
  if (!run) {
    showToast(`${data.title} opened`);
    return;
  }
  if (coachFocus === "intonation") {
    startTuner();
    showToast("Listen and hold the note steady.");
  } else if (coachFocus === "rhythm") {
    showToast("Try Rhythm Dash or String Crossing Quest!");
  } else if (coachFocus === "tone") {
    showToast("Open Tone Lab and play long bows.");
  } else if (coachFocus === "bow") {
    showToast("Start Bowing Coach for straight bow paths.");
  } else if (coachFocus === "expression") {
    showToast("Pick a song and play with emotion!");
  }
}

function navigateToView(target) {
  const btn = document.querySelector(`[data-nav="${target}"]`);
  if (btn) btn.click();
}

async function renderCoachSpotlight() {
  const list = $("#coach-spotlight");
  if (!list) return;
  const sessions = await getSessions();
  const games = await getGameResults();
  const songLogs = await getSongLogs();
  const stats = computeStats(sessions, games, []);
  const profile = computeSkillProfile(sessions, games, songLogs);
  const focus = pickFocusArea(profile);
  const suggestions = [];

  if ((profile.intonation || 0) < 55) {
    suggestions.push("Intonation: Play Finger Guardian for 2 minutes.");
  }
  if ((profile.rhythm || 0) < 55) {
    suggestions.push("Rhythm: Tap Rhythm Dash or String Crossing Quest.");
  }
  if ((profile.tone || 0) < 55) {
    suggestions.push("Tone: Long bows in Tone Lab for warm sound.");
  }
  if ((profile.bow || 0) < 55) {
    suggestions.push("Bowing: Bowing Coach + Bow Hold Hero today.");
  }
  if (!stats.totalSessions) {
    suggestions.push("Start with a 5‑minute warmup to earn stars.");
  }

  const focusPlan = COACH_FOCUS_OPTIONS[focus] || COACH_FOCUS_OPTIONS.intonation;
  suggestions.unshift(`Focus of the day: ${focusPlan.title}.`);
  if (suggestions.length > 4) suggestions.length = 4;

  list.innerHTML = "";
  suggestions.forEach((text) => {
    const li = document.createElement("li");
    li.className = "spotlight-item";
    li.textContent = text;
    list.appendChild(li);
  });

  setCoachFocus(focus);
}

function setupPandaCoach() {
  const toggle = $("#panda-toggle");
  const coach = $("#panda-coach");
  if (!toggle || !coach) return;
  getSetting("pandaCoachEnabled", true).then((value) => {
    pandaEnabled = value !== false;
    updatePandaCoachUI();
  });

  toggle.addEventListener("click", async () => {
    pandaEnabled = !pandaEnabled;
    await setSetting("pandaCoachEnabled", pandaEnabled);
    updatePandaCoachUI();
    if (pandaEnabled) {
      pandaSay("Panda Coach is ready! What shall we practice?", "celebrate", true);
    } else {
      const bubble = $("#panda-bubble");
      if (bubble) bubble.textContent = "Panda Coach is resting. Tap to wake me up!";
      coach.dataset.mood = "neutral";
    }
  });
}

function updatePandaCoachUI() {
  const toggle = $("#panda-toggle");
  const coach = $("#panda-coach");
  if (!toggle || !coach) return;
  toggle.textContent = `Panda Coach: ${pandaEnabled ? "On" : "Off"}`;
  coach.classList.toggle("off", !pandaEnabled);
}

function pandaSay(message, mood = "encourage", force = false) {
  if (!pandaEnabled) return;
  const now = Date.now();
  if (!force && now - lastPandaMessageAt < PANDA_COOLDOWN_MS) return;
  lastPandaMessageAt = now;
  const bubble = $("#panda-bubble");
  const coach = $("#panda-coach");
  if (bubble) bubble.textContent = message;
  if (coach) coach.dataset.mood = mood;
  if (pandaBubbleTimer) clearTimeout(pandaBubbleTimer);
  pandaBubbleTimer = setTimeout(() => {
    if (coach) coach.dataset.mood = "neutral";
  }, 4200);
}

function setupFingerGuardian() {
  const chips = $$(".finger-chip");
  const autoToggle = $("#finger-auto");
  if (!chips.length) return;

  getSetting("fingerAuto", true).then((val) => {
    fingerAuto = val !== false;
    if (autoToggle) autoToggle.checked = fingerAuto;
  });
  getSetting("fingerTarget", fingerTarget).then((val) => {
    if (val) {
      fingerTarget = val;
      setFingerTarget(fingerTarget, { silent: true });
    }
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      fingerAuto = false;
      if (autoToggle) autoToggle.checked = false;
      setSetting("fingerAuto", false);
      setFingerTarget(chip.dataset.finger);
    });
  });

  if (autoToggle) {
    autoToggle.addEventListener("change", () => {
      fingerAuto = autoToggle.checked;
      setSetting("fingerAuto", fingerAuto);
      if (fingerAuto) {
        pandaSay("I will auto-pick the note. Play a note to lock it in!", "focus", true);
      } else {
        pandaSay("Pick a note to practice!", "encourage", true);
      }
    });
  }

  setFingerTarget(fingerTarget, { silent: true });
  updateFingerTolerance({ accuracyAvg: null });
}

function setupLessonStudio() {
  const select = $("#lesson-select");
  if (!select) return;
  select.innerHTML = "";
  LESSON_LIBRARY.forEach((lesson) => {
    const option = document.createElement("option");
    option.value = lesson.id;
    option.textContent = lesson.title;
    select.appendChild(option);
  });
  lessonState.lessonId = LESSON_LIBRARY[0]?.id || null;
  lessonState.remainingSec = Math.round(getLessonById(lessonState.lessonId).steps[0].minutes * 60);
  lessonState.elapsedSec = 0;
  renderLesson();

  select.addEventListener("change", () => {
    lessonState.lessonId = select.value;
    lessonState.stepIndex = 0;
    const lesson = getLessonById(lessonState.lessonId);
    lessonState.remainingSec = lesson ? Math.round(lesson.steps[0].minutes * 60) : 0;
    lessonState.elapsedSec = 0;
    stopLessonTimer();
    renderLesson();
  });

  $("#lesson-start").addEventListener("click", () => startLesson());
  $("#lesson-pause").addEventListener("click", () => pauseLesson());
  $("#lesson-next").addEventListener("click", () => nextLessonStep());
  $("#lesson-back").addEventListener("click", () => prevLessonStep());
  $("#lesson-open-tool").addEventListener("click", () => openLessonTool());

  $("#mission-start").addEventListener("click", () => startMission());
  $("#mission-refresh").addEventListener("click", () => renderMission());
  $("#start-warmup").addEventListener("click", () => launchLesson("warmup-wizard"));
  $("#start-technique-lesson").addEventListener("click", () => launchLesson("technique-lab"));

  renderMission();
}

function getLessonById(id) {
  return LESSON_LIBRARY.find((lesson) => lesson.id === id) || LESSON_LIBRARY[0];
}

function renderLesson() {
  const lesson = getLessonById(lessonState.lessonId);
  if (!lesson) return;
  const title = $("#lesson-title");
  const focus = $("#lesson-focus");
  const stepsEl = $("#lesson-steps");
  const progress = $("#lesson-progress-bar");
  if (title) title.textContent = lesson.title;
  if (focus) focus.textContent = lesson.focus;
  if (stepsEl) {
    stepsEl.innerHTML = "";
    lesson.steps.forEach((step, index) => {
      const div = document.createElement("div");
      div.className = `lesson-step ${index === lessonState.stepIndex ? "active" : ""}`;
      div.textContent = step.text;
      stepsEl.appendChild(div);
    });
  }
  const { totalSec, elapsedSec } = computeLessonProgress(lesson);
  if (progress) {
    const percent = totalSec ? Math.round((elapsedSec / totalSec) * 100) : 0;
    progress.style.width = `${percent}%`;
  }
  updateLessonTimer();
}

function computeLessonProgress(lesson) {
  const totalSec = lesson.steps.reduce((sum, step) => sum + step.minutes * 60, 0);
  const completed = lesson.steps
    .slice(0, lessonState.stepIndex)
    .reduce((sum, step) => sum + step.minutes * 60, 0);
  const currentTotal = lesson.steps[lessonState.stepIndex]?.minutes * 60 || 0;
  const elapsedSec = completed + Math.max(0, currentTotal - (lessonState.remainingSec || 0));
  return { totalSec, elapsedSec };
}

function startLesson() {
  const lesson = getLessonById(lessonState.lessonId);
  if (!lesson) return;
  lessonState.running = true;
  if (!lessonState.remainingSec) {
    const step = lesson.steps[lessonState.stepIndex];
    lessonState.remainingSec = Math.round(step.minutes * 60);
  }
  tickLesson();
  lessonState.timerId = setInterval(tickLesson, 1000);
  $("#lesson-status").textContent = "In progress…";
  pandaSay(`Lesson time! Step ${lessonState.stepIndex + 1} starts now.`, "focus", true);
}

function pauseLesson() {
  stopLessonTimer();
  $("#lesson-status").textContent = "Paused.";
}

function stopLessonTimer() {
  lessonState.running = false;
  if (lessonState.timerId) clearInterval(lessonState.timerId);
  lessonState.timerId = null;
}

function tickLesson() {
  if (!lessonState.running) return;
  if (lessonState.remainingSec > 0) {
    lessonState.remainingSec -= 1;
  } else {
    nextLessonStep(true);
    return;
  }
  lessonState.elapsedSec += 1;
  renderLesson();
}

function updateLessonTimer() {
  const timer = $("#lesson-timer");
  if (!timer) return;
  const remaining = lessonState.remainingSec || 0;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  timer.textContent = `${minutes}:${seconds}`;
}

function nextLessonStep(auto = false) {
  const lesson = getLessonById(lessonState.lessonId);
  if (!lesson) return;
  if (lessonState.stepIndex < lesson.steps.length - 1) {
    lessonState.stepIndex += 1;
    lessonState.remainingSec = Math.round(lesson.steps[lessonState.stepIndex].minutes * 60);
    renderLesson();
    if (!auto) {
      showToast("Next step!");
      pandaSay("Nice! On to the next step.", "encourage");
    }
  } else {
    completeLesson();
  }
}

function prevLessonStep() {
  const lesson = getLessonById(lessonState.lessonId);
  if (!lesson) return;
  lessonState.stepIndex = Math.max(0, lessonState.stepIndex - 1);
  lessonState.remainingSec = Math.round(lesson.steps[lessonState.stepIndex].minutes * 60);
  renderLesson();
}

async function completeLesson() {
  const lesson = getLessonById(lessonState.lessonId);
  stopLessonTimer();
  lessonState.stepIndex = 0;
  lessonState.remainingSec = 0;
  lessonState.elapsedSec = 0;
  $("#lesson-status").textContent = "Lesson complete!";
  renderLesson();
  pandaSay("Lesson complete! You did it! 🎉", "celebrate", true);
  const minutes = lesson.steps.reduce((sum, step) => sum + step.minutes, 0);
  await awardXP(Math.round(minutes * 6), "Lesson completed");
  await addSession({
    date: new Date().toISOString(),
    minutes,
    mood: "sparkle",
    focus: 4,
    rhythm: 3,
    intonation: 3,
    tone: 3,
    notes: `Guided lesson: ${lesson.title}`,
    accuracy: averageAccuracy(),
  });
  await refreshDashboard();
  showToast("Lesson complete! 🎉");
}

function openLessonTool() {
  const lesson = getLessonById(lessonState.lessonId);
  if (!lesson) return;
  const step = lesson.steps[lessonState.stepIndex];
  const target = step?.tool;
  if (target) {
    const btn = document.querySelector(`[data-nav="${target}"]`);
    if (btn) btn.click();
  } else {
    showToast("No tool needed for this step.");
  }
}

function launchLesson(id) {
  lessonState.lessonId = id;
  lessonState.stepIndex = 0;
  const lesson = getLessonById(id);
  lessonState.remainingSec = lesson ? Math.round(lesson.steps[0].minutes * 60) : 0;
  lessonState.elapsedSec = 0;
  const select = $("#lesson-select");
  if (select) select.value = id;
  renderLesson();
  document.querySelector('[data-nav="coach"]').click();
  startLesson();
}

async function renderMission() {
  const missionTitle = $("#mission-title");
  const missionSummary = $("#mission-summary");
  if (!missionTitle || !missionSummary) return;
  const sessions = await getSessions();
  const games = await getGameResults();
  const songLogs = await getSongLogs();
  const stats = computeStats(sessions, games, []);
  const profile = computeSkillProfile(sessions, games, songLogs);
  const focus = pickFocusArea(profile);
  const lesson = pickLessonForFocus(focus) || LESSON_LIBRARY[0];
  missionTitle.textContent = `Mission: ${lesson.title}`;
  missionSummary.textContent = `${lesson.focus} • ${lesson.steps.length} steps`;
  missionTitle.dataset.lessonId = lesson.id;
}

function pickLessonForFocus(focus) {
  if (focus === "intonation") return LESSON_LIBRARY.find((l) => l.id === "intonation-lab");
  if (focus === "rhythm") return LESSON_LIBRARY.find((l) => l.id === "rhythm-explorer");
  if (focus === "bow" || focus === "tone") return LESSON_LIBRARY.find((l) => l.id === "tone-builder");
  return LESSON_LIBRARY.find((l) => l.id === "technique-lab");
}

function startMission() {
  const missionTitle = $("#mission-title");
  const lessonId = missionTitle?.dataset.lessonId;
  if (lessonId) {
    launchLesson(lessonId);
  }
}

function setupGames() {
  setupPitchQuest();
  setupRhythmDash();
  setupMemoryGame();
  setupBowHold();
  setupCrossingQuest();
  setupEarTrainer();
  setupRhythmPainter();
  setupGameCoach();
  setupStorySongGame();
}

function stopActiveGames(silent = true) {
  if (pitchSession.active) finishPitchQuest(true, silent);
  if (rhythmSession.active) stopRhythmDash(true, silent);
  if (pizzicatoSession.active) stopPizzicatoGame(silent);
  if (crossingSession.active) stopCrossingQuest(true, silent);
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
  setupGuidedSongPractice();
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
  resetGuidedPractice();
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

function setupGuidedSongPractice() {
  const toggle = $("#guided-toggle");
  const start = $("#guided-start");
  const next = $("#guided-next");
  const easy = $("#guided-easy");
  const ok = $("#guided-ok");
  const tricky = $("#guided-tricky");
  if (!toggle || !start || !next || !easy || !ok || !tricky) return;

  toggle.checked = guidedMode;
  toggle.addEventListener("change", () => {
    guidedMode = toggle.checked;
    updateGuidedStatus(guidedMode ? "Guided mode on. Tap start." : "Guided mode off.");
  });

  start.addEventListener("click", () => startGuidedPractice());
  next.addEventListener("click", () => {
    if (!guidedActive) return;
    guidedIndex = Math.min(guidedIndex + 1, guidedSections.length);
    playGuidedSection();
  });
  easy.addEventListener("click", () => rateGuidedSection("easy"));
  ok.addEventListener("click", () => rateGuidedSection("ok"));
  tricky.addEventListener("click", () => rateGuidedSection("tricky"));

  resetGuidedPractice();
}

function buildGuidedSections(notes, beatsPerSection = 8) {
  const sections = [];
  let current = [];
  let beats = 0;
  let startIndex = 0;
  notes.forEach((note, idx) => {
    current.push(note);
    beats += note.beats;
    if (beats >= beatsPerSection) {
      sections.push({ startIndex, endIndex: idx, notes: current, beats });
      current = [];
      beats = 0;
      startIndex = idx + 1;
    }
  });
  if (current.length) {
    sections.push({ startIndex, endIndex: notes.length - 1, notes: current, beats });
  }
  return sections;
}

function renderGuidedCheckpoints() {
  const checkpoints = $("#guided-checkpoints");
  if (!checkpoints) return;
  checkpoints.innerHTML = "";
  guidedSections.forEach((section, index) => {
    const chip = document.createElement("div");
    chip.className = `guided-chip ${index === guidedIndex ? "active" : ""}`;
    chip.textContent = `Section ${index + 1}`;
    checkpoints.appendChild(chip);
  });
}

function updateGuidedStatus(text) {
  const status = $("#guided-status");
  if (status) status.textContent = text;
}

function setGuidedButtonsEnabled(enabled) {
  ["guided-easy", "guided-ok", "guided-tricky"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enabled;
  });
}

function resetGuidedPractice() {
  const song = getSelectedSong();
  guidedSections = song ? buildGuidedSections(song.notes) : [];
  guidedIndex = 0;
  guidedActive = false;
  guidedRatings = [];
  renderGuidedCheckpoints();
  setGuidedButtonsEnabled(false);
  const nextBtn = $("#guided-next");
  if (nextBtn) nextBtn.disabled = true;
  updateGuidedStatus("Guided mode helps you practice tiny sections.");
}

function startGuidedPractice() {
  if (!guidedMode) {
    guidedMode = true;
    const toggle = $("#guided-toggle");
    if (toggle) toggle.checked = true;
  }
  guidedActive = true;
  guidedIndex = 0;
  guidedRatings = [];
  renderGuidedCheckpoints();
  playGuidedSection();
  pandaSay("Guided practice on! Let's focus on tiny sections.", "focus", true);
}

function playGuidedSection() {
  if (!guidedActive) return;
  if (guidedIndex >= guidedSections.length) {
    finishGuidedPractice();
    return;
  }
  const section = guidedSections[guidedIndex];
  updateGuidedStatus(`Section ${guidedIndex + 1} of ${guidedSections.length}`);
  renderGuidedCheckpoints();
  setGuidedButtonsEnabled(false);
  const nextBtn = $("#guided-next");
  if (nextBtn) nextBtn.disabled = false;
  startSongPlayback({ customNotes: section.notes, logPlayback: false, guided: true });
}

function handleGuidedSectionComplete() {
  updateGuidedStatus("How did that section feel?");
  setGuidedButtonsEnabled(true);
  pandaSay("Nice section! Rate how it felt.", "encourage");
}

async function rateGuidedSection(rating) {
  if (!guidedActive) return;
  guidedRatings[guidedIndex] = rating;
  guidedIndex += 1;
  setGuidedButtonsEnabled(false);
  if (guidedIndex < guidedSections.length) {
    playGuidedSection();
  } else {
    await finishGuidedPractice();
  }
}

async function finishGuidedPractice() {
  guidedActive = false;
  renderGuidedCheckpoints();
  updateGuidedStatus("Guided practice complete! 🎉");
  const nextBtn = $("#guided-next");
  if (nextBtn) nextBtn.disabled = true;
  pandaSay("Guided practice complete! You’re leveling up!", "celebrate", true);
  const song = getSelectedSong();
  if (song) {
    const totalBeats = song.notes.reduce((sum, n) => sum + n.beats, 0);
    const tempo = parseInt($("#song-tempo").value, 10) || song.bpm;
    const durationSec = Math.round((totalBeats / tempo) * 60);
    await logSongPractice(Math.max(10, durationSec));
  }
  await awardXP(20, "Guided practice");
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

async function startSongPlayback({ preview = false, preserveStart = false, customNotes = null, logPlayback = true, guided = false } = {}) {
  const song = getSelectedSong();
  if (!song) return;
  await ensureAudioContext();
  stopSongPlayback(false);
  stopSongNodes();
  await requestWakeLock();

  songState.playing = true;
  songState.previewing = preview || !logPlayback;
  songState.guidedMode = guided;
  const tempo = parseInt($("#song-tempo").value, 10) || song.bpm;
  const secondsPerBeat = 60 / tempo;
  const countInBeats = 2;
  const noteSequence = customNotes || (preview ? sliceNotesByBeats(song.notes, 8) : song.notes);
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
  if (preview) {
    pandaSay("Preview time! Listen for the melody.", "focus");
  } else {
    pandaSay("Count-in! Play with the beat.", "focus", true);
  }
}

function stopSongPlayback(log = true) {
  if (!songState.playing) return;
  const wasPreviewing = songState.previewing;
  songState.playing = false;
  songState.previewing = false;
  songState.guidedMode = false;
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
  if (guidedActive) {
    guidedActive = false;
    updateGuidedStatus("Guided practice stopped.");
    setGuidedButtonsEnabled(false);
    const nextBtn = $("#guided-next");
    if (nextBtn) nextBtn.disabled = true;
  }
  if (log) showToast("Song stopped");
}

async function finishSongPlayback({ preview = false } = {}) {
  const wasGuided = songState.guidedMode;
  songState.playing = false;
  songState.previewing = false;
  songState.guidedMode = false;
  if (songHighlightTimer) cancelAnimationFrame(songHighlightTimer);
  songTimeline.forEach((entry) => entry.element && entry.element.classList.remove("active"));
  const bar = $("#song-progress-bar");
  if (bar) bar.style.width = "0%";
  const countdown = $("#song-countdown");
  if (countdown) countdown.textContent = preview ? "Preview done!" : "Song complete!";
  stopSongNodes();
  releaseWakeLock();
  if (wasGuided && guidedActive) {
    handleGuidedSectionComplete();
    return;
  }
  if (!preview) {
    const durationSec = Math.max(1, Math.round((Date.now() - songPracticeStart) / 1000));
    await logSongPractice(durationSec);
  }
  await renderRepertoire();
  showToast(preview ? "Preview done!" : "Song complete!");
  if (!preview) pandaSay("Beautiful playing! High five! 🐾", "celebrate", true);
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
    await awardXP(Math.max(5, Math.round(durationSec / 5)), "Song play");
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
  const roundEl = $("#pitch-round");
  const streakEl = $("#pitch-streak");
  const comboEl = $("#pitch-combo");
  const timerEl = $("#pitch-timer");
  const roundSlider = $("#pitch-round-time");
  const roundDisplay = $("#pitch-round-time-display");
  const modeSelect = $("#pitch-mode");
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

  if (modeSelect) {
    getSetting("pitchMode", "single").then((val) => {
      pitchSession.mode = val || "single";
      modeSelect.value = pitchSession.mode;
    });
    modeSelect.addEventListener("change", () => {
      pitchSession.mode = modeSelect.value;
      setSetting("pitchMode", pitchSession.mode);
    });
  }

  if (roundSlider && roundDisplay) {
    getSetting("pitchRoundDuration", 4).then((val) => {
      const duration = Math.max(2, Math.min(6, parseInt(val, 10) || 4));
      pitchSession.roundDuration = duration;
      roundSlider.value = duration;
      roundDisplay.textContent = `${duration}s per round`;
      if (timerEl) timerEl.textContent = `${duration}s`;
    });
    roundSlider.addEventListener("input", () => {
      pitchSession.roundDuration = parseInt(roundSlider.value, 10);
      roundDisplay.textContent = `${roundSlider.value}s per round`;
      if (timerEl) timerEl.textContent = `${roundSlider.value}s`;
      setSetting("pitchRoundDuration", pitchSession.roundDuration);
    });
  }

  $$(".pitch-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      currentTarget = chip.dataset.target;
      updatePitchTargetLabel();
      showToast(`Target set to ${currentTarget}`);
    });
  });

  const updatePitchUI = () => {
    if (roundEl) roundEl.textContent = `${pitchSession.round}/${pitchSession.totalRounds}`;
    if (streakEl) streakEl.textContent = `${pitchSession.streak}`;
    if (comboEl) comboEl.textContent = `x${pitchSession.combo}`;
    if (timerEl && !pitchSession.active) timerEl.textContent = "0s";
  };

  $("#pitch-start").addEventListener("click", async () => {
    if (pitchSession.active) return;
    pitchSession.active = true;
    pitchSession.round = 0;
    pitchSession.streak = 0;
    pitchSession.combo = 1;
    pitchSession.score = 0;
    pitchSession.hits = 0;
    pitchSession.misses = 0;
    pitchSession.ladderIndex = 0;
    pitchSession.totalRounds = pitchSession.mode === "single" ? 1 : pitchSession.mode === "ladder" ? 5 : 8;
    resultEl.textContent = "Listening... play your note!";
    updatePitchUI();
    await runPitchRound();
  });

  $("#pitch-stop").addEventListener("click", () => finishPitchQuest(true));
  updatePitchUI();
}

async function runPitchRound() {
  if (!pitchSession.active) return;
  pitchSession.round += 1;
  await selectPitchTargetForRound();
  pitchGameSamples = [];
  pitchGameActive = true;
  pitchSession.autoStop = !tunerActive;
  pitchGameAutoStop = pitchSession.autoStop;
  if (!tunerActive) await startTuner();

  const durationMs = pitchSession.roundDuration * 1000;
  const timerEl = $("#pitch-timer");
  const start = performance.now();
  if (pitchSession.roundTimerId) clearInterval(pitchSession.roundTimerId);
  pitchSession.roundTimerId = setInterval(() => {
    const remaining = Math.max(0, durationMs - (performance.now() - start));
    if (timerEl) timerEl.textContent = `${Math.ceil(remaining / 1000)}s`;
  }, 200);

  if (pitchSession.timerId) clearTimeout(pitchSession.timerId);
  pitchSession.timerId = setTimeout(() => finishPitchQuest(false), durationMs);
  const roundEl = $("#pitch-round");
  if (roundEl) roundEl.textContent = `${pitchSession.round}/${pitchSession.totalRounds}`;
}

async function selectPitchTargetForRound() {
  const pitchAuto = $("#pitch-auto");
  const profile = getGameProfile("pitch");
  const level = profile.level || 1;
  const available = getPitchTargetsForLevel(level);

  if (pitchSession.mode === "ladder") {
    const index = pitchSession.ladderIndex % available.length;
    currentTarget = available[index];
    pitchSession.ladderIndex += 1;
  } else if (pitchSession.mode === "lightning") {
    currentTarget = available[Math.floor(Math.random() * available.length)];
  } else if (pitchAuto && pitchAuto.checked && adaptiveCoachEnabled) {
    const target = await recommendPitchTarget();
    if (target) currentTarget = target;
  }
  updatePitchTargetLabel();
}

function getPitchTargetsForLevel(level) {
  const base = ["G3", "D4", "A4", "E5"];
  if (level >= 3) {
    return [...base, ...FINGER_TARGETS];
  }
  return base;
}

function finishPitchQuest(manual = false, silent = false) {
  if (!pitchSession.active && manual) return;
  pitchGameActive = false;
  if (pitchSession.timerId) clearTimeout(pitchSession.timerId);
  if (pitchSession.roundTimerId) clearInterval(pitchSession.roundTimerId);

  const resultEl = $("#pitch-result");
  const avg = pitchGameSamples.length
    ? pitchGameSamples.reduce((a, b) => a + b, 0) / pitchGameSamples.length
    : 0;
  const accuracy = Math.round(avg * 100);
  const hit = avg >= 0.72;
  if (hit) {
    pitchSession.hits += 1;
    pitchSession.streak += 1;
    pitchSession.combo = Math.min(5, pitchSession.combo + 1);
  } else {
    pitchSession.misses += 1;
    pitchSession.streak = 0;
    pitchSession.combo = 1;
  }
  pitchSession.score += Math.round(accuracy * (hit ? pitchSession.combo : 0.5));

  const streakEl = $("#pitch-streak");
  const comboEl = $("#pitch-combo");
  if (streakEl) streakEl.textContent = `${pitchSession.streak}`;
  if (comboEl) comboEl.textContent = `x${pitchSession.combo}`;

  if (!pitchGameSamples.length) {
    resultEl.textContent = "No sound detected. Try again with a strong note.";
  } else {
    resultEl.textContent = `${hit ? "Hit!" : "Miss"} • ${accuracy}% accuracy`;
  }

  if (!manual && pitchSession.round < pitchSession.totalRounds) {
    setTimeout(() => runPitchRound(), 700);
    return;
  }

  pitchSession.active = false;
  const accuracyRatio = pitchSession.totalRounds
    ? pitchSession.hits / pitchSession.totalRounds
    : 0;
  const stars = Math.min(5, Math.max(1, Math.round(accuracyRatio * 5)));
  const result = {
    type: "pitch",
    score: pitchSession.score,
    stars,
    target: currentTarget,
    rounds: pitchSession.totalRounds,
    hits: pitchSession.hits,
    streak: pitchSession.streak,
    mode: pitchSession.mode,
  };
  if (pitchSession.totalRounds > 0 && !silent) {
    addGameResult(result).then(() => {
      refreshDashboard();
      renderGameCoach();
      awardGameXP(result);
    });
    const profile = getGameProfile("pitch");
    const leveledUp = accuracyRatio >= 0.7 && pitchSession.totalRounds > 1;
    const nextLevel = leveledUp ? profile.level + 1 : profile.level;
    updateGameProfile("pitch", {
      level: nextLevel,
      bestScore: Math.max(profile.bestScore || 0, pitchSession.score),
      bestStreak: Math.max(profile.bestStreak || 0, pitchSession.streak),
    });
  }

  if (pitchGameAutoStop) stopTuner();
  const timerEl = $("#pitch-timer");
  if (timerEl) timerEl.textContent = "0s";
}

function setupRhythmDash() {
  const tempo = $("#rhythm-tempo");
  const display = $("#rhythm-tempo-display");
  const beat = $("#rhythm-dash-beat");
  const scoreEl = $("#rhythm-dash-score");
  const feedbackEl = $("#rhythm-feedback");
  const timerEl = $("#rhythm-timer");
  const streakEl = $("#rhythm-streak");
  const comboEl = $("#rhythm-combo");
  const modeSelect = $("#rhythm-mode");
  const durationSlider = $("#rhythm-duration");
  const durationDisplay = $("#rhythm-duration-display");
  const rhythmAuto = $("#rhythm-auto");

  if (rhythmAuto) {
    getSetting("rhythmAuto", true).then((val) => {
      rhythmAuto.checked = Boolean(val);
    });
    rhythmAuto.addEventListener("change", () => {
      setSetting("rhythmAuto", rhythmAuto.checked);
    });
  }

  if (modeSelect) {
    getSetting("rhythmMode", "steady").then((val) => {
      rhythmSession.mode = val || "steady";
      modeSelect.value = rhythmSession.mode;
    });
    modeSelect.addEventListener("change", () => {
      rhythmSession.mode = modeSelect.value;
      setSetting("rhythmMode", rhythmSession.mode);
    });
  }

  if (durationSlider && durationDisplay) {
    getSetting("rhythmDuration", 30).then((val) => {
      rhythmSession.duration = Math.max(15, Math.min(60, parseInt(val, 10) || 30));
      durationSlider.value = rhythmSession.duration;
      durationDisplay.textContent = `${rhythmSession.duration}s round`;
      if (timerEl) timerEl.textContent = `${rhythmSession.duration}s`;
    });
    durationSlider.addEventListener("input", () => {
      rhythmSession.duration = parseInt(durationSlider.value, 10);
      durationDisplay.textContent = `${rhythmSession.duration}s round`;
      if (timerEl) timerEl.textContent = `${rhythmSession.duration}s`;
      setSetting("rhythmDuration", rhythmSession.duration);
    });
  }

  tempo.addEventListener("input", () => {
    rhythmDashTempo = parseInt(tempo.value, 10);
    display.textContent = `${tempo.value} BPM`;
  });

  const updateRhythmUI = (label = "") => {
    if (scoreEl) scoreEl.textContent = `Score: ${rhythmSession.score}`;
    if (streakEl) streakEl.textContent = `${rhythmSession.streak}`;
    if (comboEl) comboEl.textContent = `x${rhythmSession.combo}`;
    if (feedbackEl && label) feedbackEl.textContent = label;
  };

  $("#rhythm-dash-start").addEventListener("click", async () => {
    if (rhythmSession.active) return;
    await ensureAudioContext();
    if (rhythmAuto && rhythmAuto.checked && adaptiveCoachEnabled) {
      const recTempo = await recommendRhythmTempo();
      rhythmDashTempo = recTempo;
      tempo.value = recTempo;
      display.textContent = `${recTempo} BPM`;
    }
    rhythmSession.active = true;
    rhythmSession.score = 0;
    rhythmSession.combo = 1;
    rhythmSession.streak = 0;
    rhythmSession.hits = 0;
    rhythmSession.perfect = 0;
    rhythmSession.great = 0;
    rhythmSession.ok = 0;
    rhythmSession.misses = 0;
    rhythmDashStartTime = performance.now();
    startRhythmMetronome(beat);
    updateRhythmUI("Tap with the beat!");

    const start = performance.now();
    if (rhythmSession.timerId) clearInterval(rhythmSession.timerId);
    rhythmSession.timerId = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const remaining = Math.max(0, rhythmSession.duration - elapsed);
      if (timerEl) timerEl.textContent = `${Math.ceil(remaining)}s`;
      if (remaining <= 0) stopRhythmDash();
    }, 200);
  });

  $("#rhythm-dash-stop").addEventListener("click", () => {
    stopRhythmDash(true);
  });

  $("#rhythm-dash-tap").addEventListener("click", () => {
    if (!rhythmSession.active) return;
    const interval = 60000 / rhythmDashTempo;
    const now = performance.now();
    const delta = (now - rhythmDashStartTime) % interval;
    const error = Math.min(delta, interval - delta);
    let points = 0;
    let label = "Keep going!";
    if (error < 70) {
      points = 6;
      label = "Perfect!";
      rhythmSession.perfect += 1;
      rhythmSession.streak += 1;
      rhythmSession.combo = Math.min(6, rhythmSession.combo + 1);
    } else if (error < 130) {
      points = 4;
      label = "Great!";
      rhythmSession.great += 1;
      rhythmSession.streak += 1;
      rhythmSession.combo = Math.min(6, rhythmSession.combo + 1);
    } else if (error < 200) {
      points = 2;
      label = "Nice!";
      rhythmSession.ok += 1;
      rhythmSession.streak = Math.max(0, rhythmSession.streak - 1);
      rhythmSession.combo = Math.max(1, rhythmSession.combo - 1);
    } else {
      label = "Miss!";
      rhythmSession.misses += 1;
      rhythmSession.streak = 0;
      rhythmSession.combo = 1;
    }
    rhythmSession.hits += 1;
    rhythmSession.score += points * rhythmSession.combo;
    updateRhythmUI(label);

    if (rhythmSession.mode === "speed" && rhythmSession.hits % 8 === 0) {
      rhythmDashTempo = Math.min(160, rhythmDashTempo + 4);
      tempo.value = rhythmDashTempo;
      display.textContent = `${rhythmDashTempo} BPM`;
      startRhythmMetronome(beat);
    }
  });

  updateRhythmUI();
}

function startRhythmMetronome(beatEl) {
  const interval = 60000 / rhythmDashTempo;
  clearInterval(rhythmDashInterval);
  rhythmDashInterval = setInterval(() => {
    playClick();
    if (beatEl) {
      beatEl.classList.add("active");
      setTimeout(() => beatEl.classList.remove("active"), 200);
    }
  }, interval);
}

function stopRhythmDash(manual = false, silent = false) {
  if (!rhythmSession.active && manual) return;
  rhythmSession.active = false;
  clearInterval(rhythmDashInterval);
  if (rhythmSession.timerId) clearInterval(rhythmSession.timerId);
  $("#rhythm-dash-beat")?.classList.remove("active");
  const accuracy = rhythmSession.hits ? (rhythmSession.perfect + rhythmSession.great) / rhythmSession.hits : 0;
  const stars = Math.min(5, Math.max(1, Math.round(accuracy * 5)));
  const result = {
    type: "rhythm",
    score: rhythmSession.score,
    stars,
    tempo: rhythmDashTempo,
    streak: rhythmSession.streak,
    mode: rhythmSession.mode,
  };
  if (!silent) {
    addGameResult(result).then(() => {
      refreshDashboard();
      renderGameCoach();
      awardGameXP(result);
    });
    const profile = getGameProfile("rhythm");
    const leveledUp = accuracy >= 0.65;
    updateGameProfile("rhythm", {
      level: leveledUp ? profile.level + 1 : profile.level,
      bestScore: Math.max(profile.bestScore || 0, rhythmSession.score),
      bestStreak: Math.max(profile.bestStreak || 0, rhythmSession.streak),
    });
    showToast("Rhythm Dash complete!");
  }
  const timerEl = $("#rhythm-timer");
  if (timerEl) timerEl.textContent = "0s";
}

function setupMemoryGame() {
  const sequenceEl = $("#memory-sequence");
  const scoreEl = $("#memory-score");
  const livesEl = $("#memory-lives");
  const streakEl = $("#memory-streak");
  const feedbackEl = $("#memory-feedback");
  const hintBtn = $("#memory-hint");

  memorySession.lives = 3;
  memorySession.streak = 0;

  const updateMemoryUI = (message = "") => {
    if (scoreEl) scoreEl.textContent = `Score: ${memoryScore}`;
    if (livesEl) livesEl.textContent = "❤".repeat(Math.max(0, memorySession.lives));
    if (streakEl) streakEl.textContent = `${memorySession.streak}`;
    if (feedbackEl && message) feedbackEl.textContent = message;
  };

  const startMemoryRound = () => {
    if (memoryPlaying) return;
    const profile = getGameProfile("memory");
    memorySession.level = profile.level || 1;
    const length = Math.min(8, 3 + memorySession.level + Math.floor(memoryScore / 2));
    memorySequence = Array.from({ length }, () => randomNote());
    memoryInput = [];
    memorySession.hintUsed = false;
    if (hintBtn) hintBtn.disabled = false;
    sequenceEl.textContent = "Listen...";
    memoryPlaying = true;
    playNoteSequence(memorySequence).then(() => {
      memoryPlaying = false;
      sequenceEl.textContent = `Your turn! (${length} notes)`;
      updateMemoryUI("Tap the notes in the same order.");
    });
  };

  const endMemoryGame = () => {
    const stars = Math.min(5, Math.max(1, Math.round(memoryScore / 3)));
    const result = { type: "memory", score: memoryScore, stars, streak: memorySession.streak };
    addGameResult(result).then(() => {
      refreshDashboard();
      renderGameCoach();
      awardGameXP(result);
    });
    const profile = getGameProfile("memory");
    const leveledUp = memoryScore >= profile.level + 2;
    updateGameProfile("memory", {
      level: leveledUp ? profile.level + 1 : profile.level,
      bestScore: Math.max(profile.bestScore || 0, memoryScore),
      bestStreak: Math.max(profile.bestStreak || 0, memorySession.streak),
    });
    showToast("Note Memory complete!");
  };

  $("#memory-play").addEventListener("click", () => {
    startMemoryRound();
  });

  $("#memory-clear").addEventListener("click", () => {
    memoryInput = [];
    sequenceEl.textContent = "Ready for a melody!";
    updateMemoryUI("Tap Play Sequence to start again.");
  });

  if (hintBtn) {
    hintBtn.addEventListener("click", () => {
      if (!memorySequence.length || memorySession.hintUsed) return;
      memorySession.hintUsed = true;
      hintBtn.disabled = true;
      sequenceEl.textContent = "Hint replay...";
      playNoteSequence(memorySequence).then(() => {
        sequenceEl.textContent = `Your turn! (${memorySequence.length} notes)`;
        updateMemoryUI("Try again. You’ve got this!");
      });
    });
  }

  $$(".memory-note").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (memoryPlaying) return;
      if (!memorySequence.length) return;
      const note = btn.dataset.note;
      memoryInput.push(note);
      const index = memoryInput.length - 1;
      if (note !== memorySequence[index]) {
        memorySession.lives -= 1;
        memorySession.streak = 0;
        memoryInput = [];
        if (memorySession.lives <= 0) {
          sequenceEl.textContent = "Out of lives! Great try!";
          updateMemoryUI("Game over. Tap Play to try again.");
          memorySequence = [];
          memorySession.lives = 3;
          endMemoryGame();
          return;
        }
        sequenceEl.textContent = "Oops! Try again.";
        updateMemoryUI("Listen again and tap the sequence.");
        return;
      }
      if (memoryInput.length === memorySequence.length) {
        memoryScore += 1;
        memorySession.streak += 1;
        sequenceEl.textContent = "Brilliant! Next round.";
        updateMemoryUI("You matched the pattern!");
        memorySequence = [];
        memoryInput = [];
        const profile = getGameProfile("memory");
        const leveledUp = memorySession.streak >= 2 && memoryScore >= profile.level;
        if (leveledUp) {
          updateGameProfile("memory", {
            level: profile.level + 1,
            bestScore: Math.max(profile.bestScore || 0, memoryScore),
            bestStreak: Math.max(profile.bestStreak || 0, memorySession.streak),
          });
        }
      }
    });
  });

  updateMemoryUI("Listen closely and tap back the notes.");
}

function setupBowHold() {
  const timerEl = $("#bow-timer");
  const scoreEl = $("#bow-score");
  const pulse = $("#bow-pulse");
  const goalEl = $("#bow-goal");
  const streakEl = $("#bow-streak");
  const breathEl = $("#bow-breath");
  const motionToggle = $("#bow-motion");

  const updateBowUI = () => {
    if (goalEl) goalEl.textContent = `${bowSession.goal}s`;
    if (streakEl) streakEl.textContent = `${bowSession.streak}`;
  };

  const applyBowGoalFromProfile = () => {
    const profile = getGameProfile("bow");
    bowSession.level = profile.level || 1;
    bowSession.goal = 6 + Math.max(0, bowSession.level - 1) * 2;
    updateBowUI();
  };

  applyBowGoalFromProfile();

  if (motionToggle) {
    motionToggle.checked = Boolean(bowSession.motionEnabled);
    motionToggle.addEventListener("change", async () => {
      if (motionToggle.checked) {
        if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
          try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== "granted") {
              motionToggle.checked = false;
              showToast("Motion permission denied");
              return;
            }
          } catch (err) {
            motionToggle.checked = false;
            showToast("Motion permission needed");
            return;
          }
        }
        bowSession.motionEnabled = true;
        showToast("Motion check on");
      } else {
        bowSession.motionEnabled = false;
        showToast("Motion check off");
      }
    });
  }

  $("#bow-start").addEventListener("click", () => {
    clearInterval(bowTimerId);
    bowStart = performance.now();
    bowMotionWobble = 0;
    bowSession.breathPhase = 0;
    if (breathEl) breathEl.textContent = "Breathe in…";
    if (bowSession.motionEnabled) {
      if (bowMotionListener) window.removeEventListener("devicemotion", bowMotionListener);
      bowMotionListener = (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc) return;
        const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
        if (magnitude > 14) bowMotionWobble += 1;
      };
      window.addEventListener("devicemotion", bowMotionListener);
    }
    bowTimerId = setInterval(() => {
      const elapsed = (performance.now() - bowStart) / 1000;
      timerEl.textContent = `${elapsed.toFixed(1)}s`;
      pulse.style.transform = `scale(${1 + Math.sin(performance.now() / 400) * 0.05})`;
      if (breathEl) {
        bowSession.breathPhase = (bowSession.breathPhase + 1) % 20;
        breathEl.textContent = bowSession.breathPhase < 10 ? "Breathe in…" : "Breathe out…";
      }
    }, 100);
  });

  $("#bow-stop").addEventListener("click", () => {
    if (!bowStart) return;
    clearInterval(bowTimerId);
    if (bowMotionListener) {
      window.removeEventListener("devicemotion", bowMotionListener);
      bowMotionListener = null;
    }
    const elapsed = (performance.now() - bowStart) / 1000;
    bowBest = Math.max(bowBest, elapsed);
    scoreEl.textContent = `Best: ${bowBest.toFixed(1)}s`;
    timerEl.textContent = `${elapsed.toFixed(1)}s`;
    const wobblePenalty = bowSession.motionEnabled ? Math.min(3, Math.floor(bowMotionWobble / 4)) : 0;
    const success = elapsed >= bowSession.goal && wobblePenalty < 3;
    if (success) {
      bowSession.streak += 1;
      const profile = getGameProfile("bow");
      const leveledUp = bowSession.streak >= 2;
      updateGameProfile("bow", {
        level: leveledUp ? profile.level + 1 : profile.level,
        bestScore: Math.max(profile.bestScore || 0, Math.round(elapsed)),
        bestStreak: Math.max(profile.bestStreak || 0, bowSession.streak),
      });
      applyBowGoalFromProfile();
    } else {
      bowSession.streak = 0;
    }
    updateBowUI();
    const stars = Math.min(5, Math.max(1, Math.floor(elapsed / bowSession.goal * 5)));
    const result = {
      type: "bow",
      score: Math.round(elapsed),
      stars,
      goal: bowSession.goal,
      streak: bowSession.streak,
      wobble: bowMotionWobble,
    };
    addGameResult(result).then(() => {
      refreshDashboard();
      renderGameCoach();
      awardGameXP(result);
    });
    bowStart = 0;
    if (breathEl) breathEl.textContent = "Breathe in… breathe out…";
  });
}

function setupCrossingQuest() {
  const seqEl = $("#crossing-sequence");
  const scoreEl = $("#crossing-score");
  const feedbackEl = $("#crossing-feedback");
  const streakEl = $("#crossing-streak");
  const comboEl = $("#crossing-combo");
  const timerEl = $("#crossing-timer");
  const tempoSlider = $("#crossing-tempo");
  const tempoDisplay = $("#crossing-tempo-display");
  const beatEl = $("#crossing-beat");
  if (!seqEl || !scoreEl || !tempoSlider) return;

  const profile = getGameProfile("crossing");
  crossingSession.tempo = 88;
  crossingSession.duration = 30;
  updateGameProfileUI("crossing");
  if (timerEl) timerEl.textContent = `${crossingSession.duration}s`;

  getSetting("crossingTempo", 88).then((val) => {
    crossingSession.tempo = Math.max(60, Math.min(140, parseInt(val, 10) || 88));
    tempoSlider.value = crossingSession.tempo;
    if (tempoDisplay) tempoDisplay.textContent = `${crossingSession.tempo} BPM`;
  });

  tempoSlider.addEventListener("input", () => {
    crossingSession.tempo = parseInt(tempoSlider.value, 10);
    if (tempoDisplay) tempoDisplay.textContent = `${tempoSlider.value} BPM`;
    setSetting("crossingTempo", crossingSession.tempo);
  });

  const updateCrossingUI = (message = "") => {
    if (scoreEl) scoreEl.textContent = `Score: ${crossingSession.score}`;
    if (streakEl) streakEl.textContent = `${crossingSession.streak}`;
    if (comboEl) comboEl.textContent = `x${crossingSession.combo}`;
    if (feedbackEl && message) feedbackEl.textContent = message;
  };

  const buildSequence = () => {
    const pool = ["G", "D", "A", "E"];
    const length = Math.min(8, 4 + Math.max(0, getGameProfile("crossing").level - 1));
    crossingSession.sequence = Array.from({ length }, () => pool[Math.floor(Math.random() * pool.length)]);
    crossingSession.index = 0;
    renderCrossingSequence();
  };

  const renderCrossingSequence = () => {
    seqEl.innerHTML = "";
    crossingSession.sequence.forEach((note, idx) => {
      const span = document.createElement("span");
      span.textContent = note;
      if (idx === crossingSession.index) span.classList.add("active");
      seqEl.appendChild(span);
    });
  };

  const handleBeat = () => {
    const now = performance.now();
    if (crossingSession.awaiting) {
      crossingSession.misses += 1;
      crossingSession.streak = 0;
      crossingSession.combo = 1;
      updateCrossingUI("Missed beat! Try the next one.");
    }
    crossingSession.lastBeat = now;
    crossingSession.awaiting = true;
    if (beatEl) {
      beatEl.classList.add("active");
      setTimeout(() => beatEl.classList.remove("active"), 160);
    }
  };

  const startCrossing = () => {
    if (crossingSession.active) return;
    crossingSession.active = true;
    crossingSession.score = 0;
    crossingSession.streak = 0;
    crossingSession.combo = 1;
    crossingSession.misses = 0;
    crossingSession.awaiting = false;
    buildSequence();
    updateCrossingUI("Tap the glowing string on the beat!");

    const interval = 60000 / crossingSession.tempo;
    clearInterval(crossingSession.beatTimer);
    crossingSession.beatTimer = setInterval(handleBeat, interval);

    const start = performance.now();
    clearInterval(crossingSession.roundTimer);
    crossingSession.roundTimer = setInterval(() => {
      const remaining = Math.max(0, crossingSession.duration - (performance.now() - start) / 1000);
      if (timerEl) timerEl.textContent = `${Math.ceil(remaining)}s`;
      if (remaining <= 0) stopCrossingQuest(false);
    }, 200);
  };

  $("#crossing-start").addEventListener("click", startCrossing);
  $("#crossing-stop").addEventListener("click", () => stopCrossingQuest(true));

  $$(".crossing-note").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!crossingSession.active) return;
      const expected = crossingSession.sequence[crossingSession.index];
      const guess = btn.dataset.string;
      const now = performance.now();
      const error = Math.abs(now - crossingSession.lastBeat);
      const onBeat = error < 220;
      if (guess === expected && onBeat) {
        crossingSession.awaiting = false;
        crossingSession.streak += 1;
        crossingSession.combo = Math.min(6, crossingSession.combo + 1);
        const points = error < 90 ? 6 : error < 150 ? 4 : 2;
        crossingSession.score += points * crossingSession.combo;
        crossingSession.index += 1;
        updateCrossingUI(error < 90 ? "Perfect!" : "Great!");
        if (crossingSession.index >= crossingSession.sequence.length) {
          buildSequence();
        } else {
          renderCrossingSequence();
        }
      } else {
        crossingSession.awaiting = false;
        crossingSession.streak = 0;
        crossingSession.combo = 1;
        crossingSession.misses += 1;
        updateCrossingUI("Oops! Match the highlighted string.");
      }
    });
  });
}

function stopCrossingQuest(manual = false, silent = false) {
  if (!crossingSession.active && manual) return;
  crossingSession.active = false;
  clearInterval(crossingSession.beatTimer);
  clearInterval(crossingSession.roundTimer);
  if (manual && silent) return;
  const accuracy = crossingSession.sequence.length
    ? Math.max(0, crossingSession.streak / crossingSession.sequence.length)
    : 0;
  const stars = Math.min(5, Math.max(1, Math.round((1 - Math.min(1, crossingSession.misses / 6)) * 5)));
  const result = {
    type: "crossing",
    score: crossingSession.score,
    stars,
    streak: crossingSession.streak,
  };
  if (!silent) {
    addGameResult(result).then(() => {
      refreshDashboard();
      renderGameCoach();
      awardGameXP(result);
    });
    const profile = getGameProfile("crossing");
    const leveledUp = crossingSession.score >= 80 && crossingSession.misses <= 2;
    updateGameProfile("crossing", {
      level: leveledUp ? profile.level + 1 : profile.level,
      bestScore: Math.max(profile.bestScore || 0, crossingSession.score),
      bestStreak: Math.max(profile.bestStreak || 0, crossingSession.streak),
    });
    showToast("String Crossing Quest complete!");
  }
  const timerEl = $("#crossing-timer");
  if (timerEl) timerEl.textContent = `${crossingSession.duration}s`;
}

function setupEarTrainer() {
  const prompt = $("#ear-prompt");
  const scoreEl = $("#ear-score");
  const livesEl = $("#ear-lives");
  const streakEl = $("#ear-streak");
  const modeSelect = $("#ear-mode");
  const feedbackEl = $("#ear-feedback");

  const profile = getGameProfile("ear");
  earSession.level = profile.level || 1;
  earSession.lives = 3;
  earSession.streak = 0;

  if (modeSelect) {
    getSetting("earMode", "single").then((val) => {
      earSession.mode = val || "single";
      modeSelect.value = earSession.mode;
    });
    modeSelect.addEventListener("change", () => {
      earSession.mode = modeSelect.value;
      setSetting("earMode", earSession.mode);
    });
  }

  const updateEarUI = (message = "") => {
    if (scoreEl) scoreEl.textContent = `Score: ${earScore}`;
    if (livesEl) livesEl.textContent = "❤".repeat(Math.max(0, earSession.lives));
    if (streakEl) streakEl.textContent = `${earSession.streak}`;
    if (feedbackEl && message) feedbackEl.textContent = message;
  };

  const buildEarSequence = () => {
    const pool = getEarNotePool();
    const length = earSession.mode === "melody" ? Math.min(3, 2 + Math.floor(earSession.level / 2)) : 1;
    earSession.targetSequence = Array.from({ length }, () => pool[Math.floor(Math.random() * pool.length)]);
    earSession.input = [];
  };

  const playEarSequence = async () => {
    await ensureAudioContext();
    const seq = earSession.targetSequence;
    if (!seq.length) return;
    let time = audioCtx.currentTime + 0.1;
    seq.forEach((note) => {
      const freq = violinTargets[note];
      if (freq) playTone(freq, time, 0.5);
      time += 0.6;
    });
  };

  const startEarRound = async () => {
    buildEarSequence();
    if (prompt) prompt.textContent = earSession.mode === "melody" ? "Listen to the mini melody!" : "Listen carefully... what note is it?";
    updateEarUI("Listen, then tap the notes in order.");
    await playEarSequence();
  };

  $("#ear-play").addEventListener("click", () => {
    startEarRound();
  });

  $("#ear-repeat").addEventListener("click", () => {
    if (!earSession.targetSequence.length) {
      startEarRound();
    } else {
      playEarSequence();
    }
  });

  $$(".ear-note").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      if (!earSession.targetSequence.length) {
        showToast("Tap play to hear notes first!");
        return;
      }
      const guess = btn.dataset.note;
      const expected = earSession.targetSequence[earSession.input.length];
      if (guess === expected) {
        earSession.input.push(guess);
        if (earSession.input.length === earSession.targetSequence.length) {
          earScore += 6;
          earSession.streak += 1;
          earRound += 1;
          prompt.textContent = "Yes! You nailed it!";
          updateEarUI("Correct! Tap play for the next round.");
          earSession.targetSequence = [];
          earSession.input = [];
          const profile = getGameProfile("ear");
          const leveledUp = earSession.streak >= 3;
          const nextLevel = leveledUp ? profile.level + 1 : profile.level;
          updateGameProfile("ear", {
            level: nextLevel,
            bestScore: Math.max(profile.bestScore || 0, earScore),
            bestStreak: Math.max(profile.bestStreak || 0, earSession.streak),
          });
          earSession.level = nextLevel;
        } else {
          prompt.textContent = `Good! ${earSession.input.length}/${earSession.targetSequence.length} notes`;
          updateEarUI("Keep going!");
        }
      } else {
        earSession.lives -= 1;
        earSession.streak = 0;
        if (earSession.lives <= 0) {
          prompt.textContent = `That was ${expected}. Game over!`;
          updateEarUI("Try again with Play.");
          const stars = Math.min(5, Math.max(1, Math.round(earScore / 12)));
          const result = { type: "ear", score: earScore, stars, difficulty: earDifficulty };
          addGameResult(result).then(() => {
            refreshDashboard();
            renderGameCoach();
            awardGameXP(result);
          });
          earScore = 0;
          earRound = 0;
          earSession.lives = 3;
          earSession.targetSequence = [];
          earSession.input = [];
          return;
        }
        prompt.textContent = `Oops! Try again.`;
        updateEarUI("Listen again and tap the notes in order.");
        earSession.targetSequence = [];
        earSession.input = [];
      }
    });
  });

  updateEarOptions();
  updateEarUI("Listen, then tap the notes in order.");
}

function setupRhythmPainter() {
  const patternEl = $("#rhythm-pattern");
  const scoreEl = $("#pattern-score");
  const comboEl = $("#pattern-combo");
  const streakEl = $("#pattern-streak");
  const feedbackEl = $("#pattern-feedback");
  const tempoSlider = $("#pattern-tempo");
  const tempoDisplay = $("#pattern-tempo-display");
  const listenBtn = $("#pattern-listen");

  const displayPattern = () => {
    if (!patternSequence.length) {
      patternEl.textContent = "Pattern: —";
      return;
    }
    const symbols = patternSequence.map((beat) => (beat <= 0.5 ? "♪" : "♩")).join(" ");
    patternEl.textContent = `Pattern: ${symbols}`;
  };

  if (tempoSlider && tempoDisplay) {
    getSetting("patternTempo", 96).then((val) => {
      patternSession.tempo = Math.max(60, Math.min(140, parseInt(val, 10) || 96));
      tempoSlider.value = patternSession.tempo;
      tempoDisplay.textContent = `${patternSession.tempo} BPM`;
    });
    tempoSlider.addEventListener("input", () => {
      patternSession.tempo = parseInt(tempoSlider.value, 10);
      tempoDisplay.textContent = `${tempoSlider.value} BPM`;
      setSetting("patternTempo", patternSession.tempo);
    });
  }

  const updatePatternUI = (message = "") => {
    if (scoreEl) scoreEl.textContent = `Score: ${patternScore}`;
    if (comboEl) comboEl.textContent = `x${patternSession.combo}`;
    if (streakEl) streakEl.textContent = `${patternSession.streak}`;
    if (feedbackEl && message) feedbackEl.textContent = message;
  };

  const playPatternAudio = async () => {
    if (!patternSequence.length) return;
    await ensureAudioContext();
    const interval = 60000 / patternSession.tempo;
    let offset = 0;
    patternSequence.forEach((beat) => {
      setTimeout(() => playClick(), offset);
      offset += beat * interval;
    });
    await new Promise((resolve) => setTimeout(resolve, offset + 200));
  };

  $("#pattern-start").addEventListener("click", () => {
    patternSequence = Array.from({ length: patternLength }, () => (Math.random() > 0.4 ? 1 : 0.5));
    patternIndex = 0;
    patternScore = 0;
    patternStartTime = 0;
    patternSession.combo = 1;
    patternSession.streak = 0;
    displayPattern();
    updatePatternUI("Pattern ready! Tap the beat.");
  });

  if (listenBtn) {
    listenBtn.addEventListener("click", async () => {
      if (!patternSequence.length) {
        showToast("Tap New Pattern first.");
        return;
      }
      patternSession.listening = true;
      updatePatternUI("Listening to the pattern...");
      await playPatternAudio();
      patternSession.listening = false;
      updatePatternUI("Now tap the rhythm!");
    });
  }

  $("#pattern-tap").addEventListener("click", () => {
    if (!patternSequence.length) {
      showToast("Tap New Pattern first.");
      return;
    }
    if (patternSession.listening) return;
    const interval = 60000 / patternSession.tempo;
    const now = performance.now();
    if (patternIndex === 0) {
      patternStartTime = now;
      patternScore += 2;
      patternIndex += 1;
      updatePatternUI("Nice start!");
      return;
    }
    const expected = patternSequence.slice(0, patternIndex).reduce((sum, beat) => sum + beat, 0) * interval;
    const actual = now - patternStartTime;
    const error = Math.abs(actual - expected);
    if (error < 120) {
      patternScore += 6 * patternSession.combo;
      patternSession.streak += 1;
      patternSession.combo = Math.min(6, patternSession.combo + 1);
      updatePatternUI("Perfect!");
    } else if (error < 220) {
      patternScore += 3 * patternSession.combo;
      patternSession.streak += 1;
      patternSession.combo = Math.min(6, patternSession.combo + 1);
      updatePatternUI("Great!");
    } else {
      patternScore += 1;
      patternSession.streak = 0;
      patternSession.combo = 1;
      updatePatternUI("Keep the beat!");
    }
    patternIndex += 1;
    if (patternIndex > patternSequence.length) {
      const stars = Math.min(5, Math.max(1, Math.round(patternScore / 10)));
      const result = {
        type: "pattern",
        score: patternScore,
        stars,
        length: patternSequence.length,
        tempo: patternSession.tempo,
        streak: patternSession.streak,
      };
      addGameResult(result).then(() => {
        refreshDashboard();
        renderGameCoach();
        awardGameXP(result);
      });
      const profile = getGameProfile("pattern");
      const leveledUp = patternSession.streak >= 3;
      updateGameProfile("pattern", {
        level: leveledUp ? profile.level + 1 : profile.level,
        bestScore: Math.max(profile.bestScore || 0, patternScore),
        bestStreak: Math.max(profile.bestStreak || 0, patternSession.streak),
      });
      showToast("Rhythm Painter complete!");
      patternSequence = [];
      patternIndex = 0;
      displayPattern();
      updatePatternUI("Tap New Pattern to play again.");
    }
  });
}

async function setupStorySongGame() {
  const nextBtn = $("#story-next");
  const backBtn = $("#story-back");
  const genBtn = $("#story-generate");
  const playBtn = $("#story-play");
  const saveBtn = $("#story-save");

  if (nextBtn) nextBtn.addEventListener("click", () => moveStoryStep(1));
  if (backBtn) backBtn.addEventListener("click", () => moveStoryStep(-1));
  if (genBtn) genBtn.addEventListener("click", generateStorySong);
  if (playBtn) playBtn.addEventListener("click", () => playStorySong(storySong));
  if (saveBtn) saveBtn.addEventListener("click", saveStorySong);

  storyStep = 0;
  storyAnswers = {};
  renderStoryQuestion();
  await renderStoryList();
}

function moveStoryStep(delta) {
  storyStep = Math.max(0, Math.min(STORY_QUESTIONS.length - 1, storyStep + delta));
  renderStoryQuestion();
}

function renderStoryQuestion() {
  const questionEl = $("#story-question");
  const optionsEl = $("#story-options");
  const nextBtn = $("#story-next");
  const backBtn = $("#story-back");
  const genBtn = $("#story-generate");

  if (!questionEl || !optionsEl) return;
  const current = STORY_QUESTIONS[storyStep];
  questionEl.textContent = current.question;
  optionsEl.innerHTML = "";
  current.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "story-option";
    btn.textContent = opt;
    if (storyAnswers[current.id] === opt) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      storyAnswers[current.id] = opt;
      renderStoryQuestion();
    });
    optionsEl.appendChild(btn);
  });

  if (backBtn) backBtn.disabled = storyStep === 0;
  if (nextBtn) nextBtn.disabled = storyStep >= STORY_QUESTIONS.length - 1;
  if (genBtn) {
    const ready = STORY_QUESTIONS.every((q) => storyAnswers[q.id]);
    genBtn.disabled = !ready;
  }
}

async function generateStorySong() {
  const ready = STORY_QUESTIONS.every((q) => storyAnswers[q.id]);
  if (!ready) {
    showToast("Answer all questions first.");
    return;
  }
  const prefs = await getStoryPrefs();
  const song = buildStorySong(storyAnswers, prefs);
  storySong = song;
  const result = $("#story-result");
  if (result) {
    result.textContent = `${song.title} • ${song.key} • ${song.tempo} BPM • ${song.story}`;
  }
  await updateStoryPrefs(storyAnswers);
  showToast("Your story song is ready!");
  pandaSay("Your story song is ready! Let's play it!", "celebrate", true);
}

function buildStorySong(answers, prefs) {
  const mood = answers.mood || "Happy";
  const tempoChoice = answers.tempo || "Medium";
  const friend = answers.friend || "Red Panda";
  const place = answers.place || "Forest";

  const baseTempo = mood === "Calm" ? 72 : mood === "Spooky" ? 80 : mood === "Brave" ? 110 : 96;
  const tempoAdjust = tempoChoice === "Slow" ? -18 : tempoChoice === "Fast" ? 18 : 0;
  const fastPref = (prefs.tempo && prefs.tempo.Fast) || 0;
  const slowPref = (prefs.tempo && prefs.tempo.Slow) || 0;
  const prefShift = fastPref > slowPref ? 5 : slowPref > fastPref ? -5 : 0;
  const tempo = clampTempo(baseTempo + tempoAdjust + prefShift);

  const scale = pickScale(mood);
  const rhythm = generateRhythmPattern(mood);
  const melody = generateMelody(scale.notes, rhythm.length, mood, prefs);

  const notes = rhythm.map((beats, index) => ({
    note: melody[index],
    beats,
  }));

  return {
    title: `${friend} ${place} Song`,
    key: scale.key,
    tempo,
    notes,
    story: `${mood} adventure with ${friend} in the ${place}.`,
    createdAt: new Date().toISOString(),
  };
}

function pickScale(mood) {
  if (mood === "Spooky") {
    return {
      key: "D minor",
      notes: ["D4", "E4", "F4", "G4", "A4", "Bb4", "C5", "D5"],
    };
  }
  if (mood === "Calm") {
    return {
      key: "G major",
      notes: ["G3", "A3", "B3", "C4", "D4", "E4", "F#4", "G4"],
    };
  }
  if (mood === "Brave") {
    return {
      key: "A major",
      notes: ["A3", "B3", "C#4", "D4", "E4", "F#4", "G#4", "A4"],
    };
  }
  return {
    key: "D major",
    notes: ["D4", "E4", "F#4", "G4", "A4", "B4", "C#5", "D5"],
  };
}

function generateRhythmPattern(mood) {
  const beats = [];
  const totalBeats = 16;
  const choices = mood === "Calm" ? [2, 1, 1] : mood === "Spooky" ? [1, 1, 0.5] : [1, 0.5, 1];
  const weights = mood === "Calm" ? [0.5, 0.4, 0.1] : mood === "Happy" ? [0.4, 0.5, 0.1] : [0.5, 0.4, 0.1];
  let sum = 0;
  while (sum < totalBeats - 0.1) {
    const pick = weightedPick(choices, weights);
    if (sum + pick > totalBeats + 0.1) break;
    beats.push(pick);
    sum += pick;
  }
  if (sum < totalBeats) beats.push(totalBeats - sum);
  return beats;
}

function generateMelody(scaleNotes, length, mood, prefs) {
  const melody = [];
  let index = Math.floor(scaleNotes.length / 2);
  const stepBias = mood === "Calm" ? 0.8 : mood === "Brave" ? 0.4 : 0.6;
  const preferUp = ((prefs.mood && prefs.mood.Happy) || 0) > ((prefs.mood && prefs.mood.Spooky) || 0);
  for (let i = 0; i < length; i++) {
    melody.push(scaleNotes[index]);
    const moveType = Math.random() < stepBias ? "step" : "leap";
    const direction = preferUp && Math.random() > 0.3 ? 1 : Math.random() > 0.5 ? 1 : -1;
    const step = moveType === "step" ? 1 : 2;
    index = clampIndex(index + direction * step, scaleNotes.length);
  }
  return melody;
}

function clampIndex(index, length) {
  if (index < 0) return 0;
  if (index >= length) return length - 1;
  return index;
}

function clampTempo(value) {
  return Math.max(60, Math.min(140, Math.round(value)));
}

function weightedPick(values, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < values.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return values[i];
  }
  return values[0];
}

async function getStoryPrefs() {
  const prefs = await getSetting("storyPrefs", null);
  if (prefs && typeof prefs === "object") return prefs;
  return { mood: {}, tempo: {}, friend: {}, place: {} };
}

async function updateStoryPrefs(answers) {
  const prefs = await getStoryPrefs();
  Object.entries(answers).forEach(([key, value]) => {
    prefs[key] = prefs[key] || {};
    prefs[key][value] = (prefs[key][value] || 0) + 1;
  });
  await setSetting("storyPrefs", prefs);
}

async function playStorySong(song) {
  if (!song) {
    showToast("Create a song first!");
    return;
  }
  await ensureAudioContext();
  stopStoryPlayback();
  const secondsPerBeat = 60 / song.tempo;
  const startTime = audioCtx.currentTime + 0.15;
  let beatCursor = 0;
  song.notes.forEach((noteObj) => {
    const freq = noteToFrequency(noteObj.note);
    const duration = noteObj.beats * secondsPerBeat * 0.9;
    const when = startTime + beatCursor * secondsPerBeat;
    if (freq) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.18, when + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(when);
      osc.stop(when + duration + 0.05);
      storyPlaybackNodes.push(osc, gain);
    }
    beatCursor += noteObj.beats;
  });
  clearTimeout(storyPlaybackTimeout);
  storyPlaybackTimeout = setTimeout(() => {
    stopStoryPlayback();
  }, (beatCursor * secondsPerBeat + 0.3) * 1000);
  showToast("Story song playing!");
  pandaSay("Story song time! Listen and play along.", "focus");
  await awardXP(8, "Story song");
}

function stopStoryPlayback() {
  storyPlaybackNodes.forEach((node) => {
    try { node.stop(); } catch (err) { /* ignore */ }
    try { node.disconnect(); } catch (err) { /* ignore */ }
  });
  storyPlaybackNodes = [];
}

async function saveStorySong() {
  if (!storySong) {
    showToast("Create a song first!");
    return;
  }
  await addCustomSong(storySong);
  showToast("Story song saved!");
  pandaSay("Song saved! You are a music creator! 🐼", "celebrate", true);
  await awardXP(15, "Story song saved");
  await renderStoryList();
}

async function renderStoryList() {
  const list = $("#story-list");
  if (!list) return;
  const songs = await getCustomSongs();
  list.innerHTML = "";
  if (!songs.length) {
    list.textContent = "No story songs yet. Make your first one!";
    return;
  }
  songs.slice(-6).reverse().forEach((song) => {
    const item = document.createElement("div");
    item.className = "story-item";
    item.innerHTML = `
      <div>${song.title}</div>
      <div class="muted">${song.key} • ${song.tempo} BPM</div>
      <div class="story-actions">
        <button class="ghost" data-action="play">Play</button>
        <button class="ghost" data-action="delete">Delete</button>
      </div>
    `;
    item.querySelector('[data-action="play"]').addEventListener("click", () => {
      storySong = song;
      const result = $("#story-result");
      if (result) result.textContent = `${song.title} • ${song.key} • ${song.tempo} BPM • ${song.story}`;
      playStorySong(song);
    });
    item.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      await deleteCustomSong(song.id);
      renderStoryList();
    });
    list.appendChild(item);
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

function setupRewards() {
  const claim = $("#claim-reward");
  if (claim) {
    claim.addEventListener("click", claimReward);
  }
  renderLevelPanel();
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
    <div>String Crossing tempo: <strong>${recs.rhythmTempo} BPM</strong></div>
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
  const crossing = averageRecentScore(games, "crossing");
  const scores = [
    { type: "pitch", value: pitch || 50 },
    { type: "rhythm", value: rhythm || 50 },
    { type: "crossing", value: crossing || 50 },
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

  const crossingTempo = $("#crossing-tempo");
  const crossingDisplay = $("#crossing-tempo-display");
  if (crossingTempo) {
    crossingTempo.value = recs.rhythmTempo;
    crossingSession.tempo = recs.rhythmTempo;
    if (crossingDisplay) crossingDisplay.textContent = `${recs.rhythmTempo} BPM`;
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
  updatePitchTargetLabel();
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
    const fingerStatus = $("#finger-status");
    if (fingerStatus) {
      fingerStatus.textContent = "Listening for your note…";
      fingerStatus.classList.remove("good", "warn");
      fingerStatus.classList.add("off");
    }
    updateTuner();
    showToast("Listening for violin sound");
    pandaSay("I'm listening! Play your note when you're ready.", "focus", true);
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
  const fingerStatus = $("#finger-status");
  if (fingerStatus) {
    fingerStatus.textContent = "Tuner off. Tap Start to listen.";
    fingerStatus.classList.remove("good", "warn");
    fingerStatus.classList.add("off");
  }
  const needle = $("#finger-needle");
  if (needle) needle.style.left = "50%";
  const holdEl = $("#finger-hold");
  if (holdEl) holdEl.textContent = "0.0s";
  fingerHoldStart = 0;
  fingerHold = 0;
  fingerHoldRewarded = false;
  pandaSay("Nice listening break! Tap start when you're ready.", "encourage");
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
  updateFingerGuardian(noteLabel, pitch);

  const notesEl = $("#coach-notes");
  if (Math.abs(cents) < 8) {
    notesEl.textContent = "Perfectly centered! Keep that bow gentle.";
    pandaSay(`Perfect ${noteLabel}!`, "celebrate");
  } else if (cents < 0) {
    notesEl.textContent = "A tiny bit flat. Lightly lift the finger forward.";
    pandaSay("A little low. Slide forward just a hair.", "encourage");
  } else {
    notesEl.textContent = "A little sharp. Relax and slide back a hair.";
    pandaSay("A little high. Slide back softly.", "encourage");
  }
}

function setFingerTarget(target, { silent = false } = {}) {
  if (!target) return;
  const previous = fingerTarget;
  fingerTarget = target;
  $$(".finger-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.finger === target);
  });
  if (previous !== fingerTarget) setSetting("fingerTarget", fingerTarget);
  fingerHoldStart = 0;
  fingerHold = 0;
  fingerHoldRewarded = false;
  const holdEl = $("#finger-hold");
  if (holdEl) holdEl.textContent = "0.0s";
  if (!silent) showToast(`Finger target: ${target}`);
}

function updateFingerGuardian(noteLabel, pitch) {
  const statusEl = $("#finger-status");
  const needle = $("#finger-needle");
  const tipEl = $("#finger-tip");
  const holdEl = $("#finger-hold");
  const streakEl = $("#finger-streak");
  const goalEl = $("#finger-goal");
  if (!statusEl || !needle || !tipEl) return;
  if (!pitch || !Number.isFinite(pitch)) return;

  if (fingerAuto) {
    const autoPick = pickFingerTargetFromPitch(pitch);
    if (autoPick.target && autoPick.diff < 65) {
      setFingerTarget(autoPick.target, { silent: true });
    }
  }

  const targetNote = noteNumberFromLabel(fingerTarget);
  if (!targetNote) return;
  const diff = centsOffFromPitch(pitch, targetNote);
  const clamped = Math.max(-50, Math.min(50, diff));
  needle.style.left = `${50 + clamped}%`;
  if (goalEl) goalEl.textContent = `${fingerHoldGoal}s`;

  statusEl.classList.remove("good", "warn", "off");
  const abs = Math.abs(diff);
  if (abs <= fingerTolerance) {
    statusEl.classList.add("good");
    statusEl.textContent = `${fingerTarget} • Perfect finger spot!`;
    tipEl.textContent = `Stay within ±${fingerTolerance}¢. Keep the bow steady.`;
    if (!fingerHoldStart) {
      fingerHoldStart = performance.now();
      fingerHoldRewarded = false;
    }
    fingerHold = (performance.now() - fingerHoldStart) / 1000;
    if (holdEl) holdEl.textContent = `${fingerHold.toFixed(1)}s`;
    if (streakEl) streakEl.textContent = `${fingerStreak}`;
    if (fingerHold >= fingerHoldGoal && !fingerHoldRewarded) {
      fingerHoldRewarded = true;
      fingerStreak += 1;
      if (streakEl) streakEl.textContent = `${fingerStreak}`;
      pandaSay("Great hold! Ready for the next note!", "celebrate");
      showToast("Great hold! ⭐");
      if (fingerAuto) {
        const nextIndex = (FINGER_TARGETS.indexOf(fingerTarget) + 1) % FINGER_TARGETS.length;
        setFingerTarget(FINGER_TARGETS[nextIndex]);
        fingerHoldStart = performance.now();
        fingerHold = 0;
        fingerHoldRewarded = false;
      }
    }
    pandaSay(`Sweet spot! ${fingerTarget} shines.`, "celebrate");
  } else if (diff < 0) {
    statusEl.classList.add("warn");
    statusEl.textContent = `${fingerTarget} • A bit low`;
    tipEl.textContent = `Slide forward toward the bridge (±${fingerTolerance}¢ zone).`;
    fingerHoldStart = 0;
    fingerHold = 0;
    fingerHoldRewarded = false;
    if (holdEl) holdEl.textContent = "0.0s";
  } else {
    statusEl.classList.add("warn");
    statusEl.textContent = `${fingerTarget} • A bit high`;
    tipEl.textContent = `Slide back toward the scroll (±${fingerTolerance}¢ zone).`;
    fingerHoldStart = 0;
    fingerHold = 0;
    fingerHoldRewarded = false;
    if (holdEl) holdEl.textContent = "0.0s";
  }
}

function updateFingerTolerance(stats) {
  const accuracy = stats && typeof stats.accuracyAvg === "number" ? stats.accuracyAvg : null;
  if (accuracy !== null && !Number.isNaN(accuracy)) {
    const raw = Math.round(22 - Math.min(12, accuracy / 8));
    fingerTolerance = Math.max(10, Math.min(22, raw));
    fingerHoldGoal = accuracy >= 85 ? 3 : accuracy >= 70 ? 2 : 1.5;
  } else {
    fingerTolerance = 18;
    fingerHoldGoal = 2;
  }
  const tipEl = $("#finger-tip");
  if (tipEl) tipEl.textContent = `Aim for the center line (±${fingerTolerance}¢).`;
}

function pickFingerTargetFromPitch(pitch) {
  let bestTarget = null;
  let bestDiff = Infinity;
  FINGER_TARGETS.forEach((target) => {
    const noteNum = noteNumberFromLabel(target);
    if (!noteNum) return;
    const diff = Math.abs(centsOffFromPitch(pitch, noteNum));
    if (diff < bestDiff) {
      bestDiff = diff;
      bestTarget = target;
    }
  });
  return { target: bestTarget, diff: bestDiff };
}

function noteFromPitch(frequency) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function noteNumberFromLabel(label) {
  if (!label) return null;
  const match = label.match(/^([A-G])([#b]?)(-?\d)$/);
  if (!match) return null;
  const [, letter, accidental, octaveRaw] = match;
  const key = `${letter}${accidental || ""}`;
  const semitone = NOTE_OFFSETS[key];
  if (semitone === undefined) return null;
  const octave = parseInt(octaveRaw, 10);
  return (octave + 1) * 12 + semitone;
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

function setupBowingCoach() {
  const startBtn = $("#bow-coach-start");
  const stopBtn = $("#bow-coach-stop");
  if (!startBtn || !stopBtn) return;
  startBtn.addEventListener("click", () => startBowingCoach());
  stopBtn.addEventListener("click", () => stopBowingCoach());
}

function startBowingCoach() {
  bowCoachActive = true;
  bowCoachStart = performance.now();
  animateBowing(bowCoachStart);
  showToast("Bowing coach started");
  pandaSay("Bow coach on! Follow the panda's bow path.", "focus", true);
}

function stopBowingCoach() {
  bowCoachActive = false;
  if (bowCoachAnimation) cancelAnimationFrame(bowCoachAnimation);
  const dot = $("#bow-dot");
  const direction = $("#bow-direction");
  if (dot) dot.style.left = "0%";
  if (direction) direction.textContent = "Ready";
  pandaSay("Nice bowing! Take a stretch break.", "encourage");
}

function animateBowing(now) {
  if (!bowCoachActive) return;
  const cycle = 2400;
  const elapsed = (now - bowCoachStart) % cycle;
  const progress = elapsed / cycle;
  const direction = progress < 0.5 ? "Down Bow" : "Up Bow";
  const phase = progress < 0.5 ? progress / 0.5 : 1 - (progress - 0.5) / 0.5;
  const dot = $("#bow-dot");
  const dirLabel = $("#bow-direction");
  if (dot) dot.style.left = `${Math.round(phase * 100)}%`;
  if (dirLabel) dirLabel.textContent = direction;
  bowCoachAnimation = requestAnimationFrame(animateBowing);
}

function setupPostureMirror() {
  const startBtn = $("#posture-start");
  const stopBtn = $("#posture-stop");
  if (startBtn) startBtn.addEventListener("click", () => startPostureCamera());
  if (stopBtn) stopBtn.addEventListener("click", () => stopPostureCamera());
}

async function startPostureCamera() {
  const video = $("#posture-video");
  if (!video) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast("Camera not supported on this device.");
    return;
  }
  try {
    postureStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    video.srcObject = postureStream;
    await video.play();
    rotatePostureTips();
    if (postureTipTimer) clearInterval(postureTipTimer);
    postureTipTimer = setInterval(rotatePostureTips, 8000);
    showToast("Posture mirror on");
    pandaSay("Posture mirror on! Sit tall and relaxed.", "focus", true);
  } catch (err) {
    console.error(err);
    showToast("Camera permission needed");
  }
}

function stopPostureCamera(silent = false) {
  const video = $("#posture-video");
  if (postureStream) {
    postureStream.getTracks().forEach((track) => track.stop());
    postureStream = null;
  }
  if (video) video.srcObject = null;
  if (postureTipTimer) clearInterval(postureTipTimer);
  if (!silent) showToast("Posture mirror off");
  if (!silent) pandaSay("Posture mirror off. You did great!", "encourage");
}

function rotatePostureTips() {
  const tip = $("#posture-tip");
  if (!tip) return;
  postureTipIndex = (postureTipIndex + 1) % POSTURE_TIPS.length;
  tip.textContent = `Tip: ${POSTURE_TIPS[postureTipIndex]}`;
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

function applyPizzicatoLevel() {
  const profile = getGameProfile("pizzicato");
  pizzicatoSession.level = profile.level || 1;
  pizzicatoSession.duration = 14 + pizzicatoSession.level * 2;
  updateGameProfileUI("pizzicato");
}

function setupRhythmGame() {
  const lane = $("#rhythm-lane");
  const scoreEl = $("#rhythm-score");
  if (!lane || !scoreEl) return;
  const timerEl = $("#pizzicato-timer");
  const streakEl = $("#pizzicato-streak");
  const comboEl = $("#pizzicato-combo");
  const speedSlider = $("#pizzicato-speed");
  const speedDisplay = $("#pizzicato-speed-display");
  const feedbackEl = $("#pizzicato-feedback");

  applyPizzicatoLevel();

  if (speedSlider && speedDisplay) {
    getSetting("pizzicatoSpeed", 2).then((val) => {
      pizzicatoSession.speed = Math.max(1, Math.min(4, parseInt(val, 10) || 2));
      speedSlider.value = pizzicatoSession.speed;
      speedDisplay.textContent = `Speed ${pizzicatoSession.speed}`;
    });
    speedSlider.addEventListener("input", () => {
      pizzicatoSession.speed = parseInt(speedSlider.value, 10);
      speedDisplay.textContent = `Speed ${pizzicatoSession.speed}`;
      setSetting("pizzicatoSpeed", pizzicatoSession.speed);
    });
  }

  const updatePizzicatoUI = (message = "") => {
    if (scoreEl) scoreEl.textContent = `Score: ${pizzicatoSession.score}`;
    if (streakEl) streakEl.textContent = `${pizzicatoSession.streak}`;
    if (comboEl) comboEl.textContent = `x${pizzicatoSession.combo}`;
    if (feedbackEl && message) feedbackEl.textContent = message;
  };

  $("#rhythm-start").addEventListener("click", () => {
    if (pizzicatoSession.active) return;
    pizzicatoSession.active = true;
    pizzicatoSession.score = 0;
    pizzicatoSession.combo = 1;
    pizzicatoSession.streak = 0;
    pizzicatoSession.misses = 0;
    updatePizzicatoUI("Tap the paws before they fall!");
    const spawnInterval = Math.max(420, 900 - pizzicatoSession.speed * 120 - pizzicatoSession.level * 40);
    pizzicatoSession.spawnId = setInterval(() => spawnPaw(lane, pizzicatoSession.speed, {
      onHit: (type) => {
        if (type === "bomb") {
          pizzicatoSession.combo = 1;
          pizzicatoSession.streak = 0;
          updatePizzicatoUI("Boom! Reset and keep going.");
          return;
        }
        const bonus = type === "gold" ? 10 : 5;
        pizzicatoSession.score += bonus * pizzicatoSession.combo;
        pizzicatoSession.streak += 1;
        pizzicatoSession.combo = Math.min(6, pizzicatoSession.combo + 1);
        updatePizzicatoUI(type === "gold" ? "Golden paw! ✨" : "Great catch!");
      },
      onMiss: (type) => {
        if (type === "bomb") return;
        pizzicatoSession.misses += 1;
        pizzicatoSession.streak = 0;
        pizzicatoSession.combo = 1;
        updatePizzicatoUI("Oops! Try the next paw.");
      },
    }), spawnInterval);

    const start = performance.now();
    if (pizzicatoSession.timerId) clearInterval(pizzicatoSession.timerId);
    pizzicatoSession.timerId = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const remaining = Math.max(0, pizzicatoSession.duration - elapsed);
      if (timerEl) timerEl.textContent = `${Math.ceil(remaining)}s`;
      if (remaining <= 0) {
        stopPizzicatoGame(false);
      }
    }, 200);
  });
}

function stopPizzicatoGame(silent = false) {
  if (!pizzicatoSession.active) return;
  clearInterval(pizzicatoSession.timerId);
  clearInterval(pizzicatoSession.spawnId);
  pizzicatoSession.active = false;
  if (silent) return;
  const stars = Math.min(5, Math.max(1, Math.round(pizzicatoSession.score / 25)));
  const result = { type: "pizzicato", score: pizzicatoSession.score, stars, streak: pizzicatoSession.streak };
  addGameResult(result).then(() => {
    refreshDashboard();
    renderGameCoach();
    awardGameXP(result);
  });
  showToast("Panda Pizzicato complete!");
  const profile = getGameProfile("pizzicato");
  const leveledUp = pizzicatoSession.score >= 60 && pizzicatoSession.misses <= 3;
  updateGameProfile("pizzicato", {
    level: leveledUp ? profile.level + 1 : profile.level,
    bestScore: Math.max(profile.bestScore || 0, pizzicatoSession.score),
    bestStreak: Math.max(profile.bestStreak || 0, pizzicatoSession.streak),
  });
  applyPizzicatoLevel();
  const timerEl = $("#pizzicato-timer");
  if (timerEl) timerEl.textContent = "0s";
}

function spawnPaw(lane, speed, { onHit, onMiss }) {
  const paw = document.createElement("div");
  paw.className = "paw";
  const roll = Math.random();
  let type = "normal";
  if (roll > 0.9) type = "gold";
  else if (roll > 0.8) type = "slow";
  else if (roll > 0.74) type = "bomb";
  paw.dataset.type = type;
  paw.classList.add(type);
  paw.textContent = type === "gold" ? "✨" : type === "bomb" ? "💥" : "♪";
  paw.style.left = `${Math.random() * 80 + 5}%`;
  paw.style.top = "-40px";
  lane.appendChild(paw);

  let pos = -40;
  const dropSpeed = type === "slow" ? Math.max(2, speed) : 3 + speed;
  const drop = setInterval(() => {
    pos += dropSpeed;
    paw.style.top = `${pos}px`;
    if (pos > 120) {
      clearInterval(drop);
      paw.remove();
      if (onMiss) onMiss(type);
    }
  }, 16);

  paw.addEventListener("click", () => {
    if (onHit) onHit(type);
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
    await awardXP(Math.round(minutes * 2 + focus * 5), "Practice session");
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
    await awardXP(Math.round(minutes * 2 + focus * 5), "Timer session");
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
  const customSongs = await getCustomSongs();
  const stats = computeStats(sessions, games, recordings);
  $("#streak-count").textContent = `${stats.streak} days`;
  $("#week-minutes").textContent = `${stats.weekMinutes} min`;
  $("#focus-stars").textContent = `${calcFocusStars(sessions)}`;
  updateFingerTolerance(stats);
  renderStickerShelf(stats);
  await updateGoalProgress(stats);
  await renderLevelPanel();
  await checkAchievements(stats, sessions, games, songLogs, customSongs);
  await renderDailyPlan(sessions, games, songLogs);
  renderSongOfDay();
  await renderRepertoire();
  renderMission();
  renderAnalysis();
  renderProgress();
  await renderRecordings();
  renderCoachSpotlight();
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

async function getXPState() {
  const state = await getSetting("xpState", null);
  if (state && typeof state === "object") return state;
  return { totalXP: 0, level: 1, lastRewardLevel: 1 };
}

function computeLevel(totalXP) {
  let level = 1;
  let remaining = totalXP;
  let next = 100;
  while (remaining >= next) {
    remaining -= next;
    level += 1;
    next = Math.round(100 + level * 60);
  }
  return { level, currentXP: remaining, nextXP: next };
}

async function awardXP(points, reason = "") {
  if (!points || points <= 0) return;
  const state = await getXPState();
  const previousLevel = state.level || 1;
  state.totalXP = (state.totalXP || 0) + points;
  const computed = computeLevel(state.totalXP);
  state.level = computed.level;
  if (!state.lastRewardLevel) state.lastRewardLevel = 1;
  await setSetting("xpState", state);
  renderLevelPanel(state, computed);
  if (computed.level > previousLevel) {
    showToast(`Level up! Level ${computed.level} 🎉`);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  } else if (reason) {
    showToast(`+${points} XP • ${reason}`);
  }
}

async function awardGameXP(result) {
  if (!result || !result.type) return;
  const base = (() => {
    switch (result.type) {
      case "pitch":
        return Math.round((result.score || 0) / 4);
      case "rhythm":
        return Math.round((result.score || 0) / 3);
      case "pizzicato":
        return Math.round((result.score || 0) / 3);
      case "memory":
        return Math.round((result.score || 0) * 2);
      case "bow":
        return Math.round((result.score || 0) * 3);
      case "ear":
        return Math.round((result.score || 0) * 2);
      case "pattern":
        return Math.round((result.score || 0) * 2);
      case "crossing":
        return Math.round((result.score || 0) / 2);
      default:
        return Math.round((result.score || 0) / 2);
    }
  })();
  const bonus = (result.stars || 0) * 5;
  const total = Math.max(5, base + bonus);
  await awardXP(total, `${gameName(result.type)} points`);
  if (result.stars >= 4) {
    pandaSay(`Amazing ${gameName(result.type)}! ${"⭐".repeat(result.stars)}`, "celebrate");
  } else {
    pandaSay(`Nice work in ${gameName(result.type)}! Keep going!`, "encourage");
  }
}

function gameName(type) {
  switch (type) {
    case "pitch":
      return "Pitch Quest";
    case "rhythm":
      return "Rhythm Dash";
    case "pizzicato":
      return "Panda Pizzicato";
    case "memory":
      return "Note Memory";
    case "bow":
      return "Bow Hold Hero";
    case "ear":
      return "Ear Trainer";
    case "pattern":
      return "Rhythm Painter";
    case "crossing":
      return "String Crossing Quest";
    default:
      return "Game";
  }
}

async function renderLevelPanel(stateOverride, computedOverride) {
  const badge = $("#level-badge");
  const bar = $("#xp-bar");
  const text = $("#xp-text");
  const reward = $("#next-reward");
  const claimBtn = $("#claim-reward");
  if (!badge || !bar || !text || !reward) return;
  const state = stateOverride || await getXPState();
  const computed = computedOverride || computeLevel(state.totalXP || 0);
  badge.textContent = `Level ${computed.level}`;
  const percent = computed.nextXP ? Math.round((computed.currentXP / computed.nextXP) * 100) : 0;
  bar.style.width = `${percent}%`;
  text.textContent = `${computed.currentXP} / ${computed.nextXP} XP`;
  const pendingReward = computed.level > (state.lastRewardLevel || 1);
  if (pendingReward) {
    const rewardText = LEVEL_REWARDS[computed.level] || "Mystery Panda Reward";
    reward.textContent = `Reward Ready: ${rewardText}`;
  } else {
    const nextRewardLevel = Math.max(computed.level + 1, (state.lastRewardLevel || 1) + 1);
    const rewardText = LEVEL_REWARDS[nextRewardLevel] || "Mystery Panda Reward";
    reward.textContent = `Next Reward: ${rewardText}`;
  }
  if (claimBtn) {
    claimBtn.disabled = !pendingReward;
    claimBtn.textContent = pendingReward ? "Claim" : "Locked";
  }
}

async function claimReward() {
  const state = await getXPState();
  const computed = computeLevel(state.totalXP || 0);
  if (computed.level <= (state.lastRewardLevel || 1)) {
    showToast("No rewards to claim yet.");
    return;
  }
  const rewardText = LEVEL_REWARDS[computed.level] || "Mystery Panda Reward";
  state.lastRewardLevel = computed.level;
  await setSetting("xpState", state);
  showToast(`Reward unlocked: ${rewardText}!`);
  renderLevelPanel(state, computed);
}

async function renderAchievements(stats, sessions, games, songLogs, customSongs) {
  const grid = $("#achievement-grid");
  if (!grid) return;
  const unlocked = new Set(await getSetting("achievementsUnlocked", []));
  grid.innerHTML = "";
  ACHIEVEMENTS.forEach((ach) => {
    const isUnlocked = unlocked.has(ach.id);
    const card = document.createElement("div");
    card.className = `achievement-card ${isUnlocked ? "unlocked" : "locked"}`;
    card.innerHTML = `
      <div class="achievement-title">${ach.title}</div>
      <div class="muted">${ach.desc}</div>
      <div class="achievement-status">${isUnlocked ? "Unlocked ✨" : "Locked"}</div>
    `;
    grid.appendChild(card);
  });
}

async function checkAchievements(stats, sessions, games, songLogs, customSongs) {
  const unlocked = new Set(await getSetting("achievementsUnlocked", []));
  let newUnlocked = [];
  ACHIEVEMENTS.forEach((ach) => {
    if (!unlocked.has(ach.id) && ach.check(stats, sessions, games, songLogs, customSongs)) {
      unlocked.add(ach.id);
      newUnlocked.push(ach);
    }
  });
  if (newUnlocked.length) {
    await setSetting("achievementsUnlocked", Array.from(unlocked));
    newUnlocked.forEach((ach) => showToast(`Achievement unlocked: ${ach.title}`));
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
  }
  renderAchievements(stats, sessions, games, songLogs, customSongs);
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
  const game = focusArea === "crossing"
    ? "String Crossing Quest"
    : focusArea === "rhythm"
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
  if (area === "crossing") return "String crossings (smooth changes)";
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
  if (lower.includes("posture")) {
    return "Sit tall like a proud panda, shoulders relaxed. Hold your violin like it’s floating on a pillow.";
  }
  if (lower.includes("tone") || lower.includes("sound")) {
    return "For warm tone: slow bow, steady pressure, and keep the bow halfway between bridge and fingerboard.";
  }
  if (lower.includes("vibrato")) {
    return "Start with gentle arm wiggles on one finger, then slow back and forth like a tiny wave.";
  }
  if (lower.includes("string") && lower.includes("cross")) {
    return "Keep your bow level and move from the elbow. Practice G-D-A-E slowly, then speed up.";
  }
  if (lower.includes("song")) {
    return `A great pick is “${song.title}.” Start slow, then add sparkle as it feels easy.`;
  }
  if (lower.includes("game")) {
    return "Try Rhythm Dash or String Crossing Quest for beat skills, or Pitch Quest for intonation.";
  }
  if (lower.includes("tired") || lower.includes("break")) {
    return "That’s okay. Take a water break, roll your shoulders, and come back for a 2‑minute glow‑up bow.";
  }
  if (lower.includes("practice") || lower.includes("today") || lower.includes("plan")) {
    const area = assignedFocus !== "auto" ? assignedFocus : focusArea;
    return `Today’s focus is ${focusAreaLabel(area)}. Try: 1) 2‑min warmup, 2) ${song.title}, 3) a fun game to finish.`;
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
  const bestCrossing = Math.max(0, ...(byType.crossing || []).map((g) => g.score || 0));
  const bestBow = Math.max(0, ...(byType.bow || []).map((g) => g.score || 0));

  const intonationScore = blendScores([
    scaleScore(accuracyAvg, 100),
    scaleScore(bestPitch, 100),
    scaleScore((intonationAvg || 3) * 20, 100),
  ]);

  const rhythmScore = blendScores([
    scaleScore(bestRhythm, 80),
    scaleScore(bestPizzicato, 80),
    scaleScore(bestCrossing, 80),
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
        <div>Best String Crossing: <strong>${stats.bestCrossing || "—"}</strong></div>
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
  const customSongs = await getCustomSongs();
  const settings = await getAllSettings();
  const payload = { sessions, games, songLogs, customSongs, recordings: recordings.map((r) => ({ ...r, blob: undefined })), settings };
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
    const tx = db.transaction(["sessions", "games", "songLogs", "customSongs", "settings"], "readwrite");
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
    if (Array.isArray(data.customSongs)) {
      const store = tx.objectStore("customSongs");
      data.customSongs.forEach((song) => {
        const { id, ...rest } = song;
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
      if (!db.objectStoreNames.contains("customSongs")) {
        db.createObjectStore("customSongs", { keyPath: "id", autoIncrement: true });
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

async function addCustomSong(song) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("customSongs", "readwrite");
    const store = tx.objectStore("customSongs");
    const request = store.add(song);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCustomSongs() {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("customSongs", "readonly");
    const store = tx.objectStore("customSongs");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deleteCustomSong(id) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("customSongs", "readwrite");
    const store = tx.objectStore("customSongs");
    const request = store.delete(id);
    request.onsuccess = () => resolve();
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
