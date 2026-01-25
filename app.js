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

const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
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
];

const DB_NAME = "emerson-violin";
const DB_VERSION = 2;
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
      releaseWakeLock();
    }
  });
  window.addEventListener("pagehide", () => {
    stopTuner();
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
}

function setupGames() {
  setupPitchQuest();
  setupRhythmDash();
  setupMemoryGame();
  setupBowHold();
}

function setupPitchQuest() {
  const resultEl = $("#pitch-result");
  updatePitchTargetLabel();

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
    addGameResult({ type: "pitch", score, stars }).then(refreshDashboard);
  }
  if (pitchGameAutoStop) stopTuner();
}

function setupRhythmDash() {
  const tempo = $("#rhythm-tempo");
  const display = $("#rhythm-tempo-display");
  const beat = $("#rhythm-dash-beat");
  const scoreEl = $("#rhythm-dash-score");

  tempo.addEventListener("input", () => {
    rhythmDashTempo = parseInt(tempo.value, 10);
    display.textContent = `${tempo.value} BPM`;
  });

  $("#rhythm-dash-start").addEventListener("click", async () => {
    if (rhythmDashActive) return;
    await ensureAudioContext();
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
    addGameResult({ type: "rhythm", score: rhythmDashScore, stars }).then(refreshDashboard);
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
        addGameResult({ type: "memory", score: memoryScore, stars }).then(refreshDashboard);
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
    addGameResult({ type: "bow", score: Math.round(elapsed), stars }).then(refreshDashboard);
    bowStart = 0;
  });
}

function randomNote() {
  const keys = Object.keys(violinTargets);
  return keys[Math.floor(Math.random() * keys.length)];
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
    const notes = $("#journal-notes").value.trim();
    const accuracy = averageAccuracy();

    await addSession({
      date: new Date().toISOString(),
      minutes,
      mood,
      focus,
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
    const notes = $("#journal-notes").value.trim();
    const accuracy = averageAccuracy();
    await addSession({
      date: new Date().toISOString(),
      minutes,
      mood,
      focus,
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
  const stats = computeStats(sessions, games, recordings);
  $("#streak-count").textContent = `${stats.streak} days`;
  $("#week-minutes").textContent = `${stats.weekMinutes} min`;
  $("#focus-stars").textContent = `${calcFocusStars(sessions)}`;
  renderStickerShelf(stats);
  await updateGoalProgress(stats);
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
      `;
    }
  }
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
}

async function saveParentSettings() {
  const goal = parseInt($("#goal-minutes").value, 10);
  const reminder = $("#reminder-time").value;
  const newPin = $("#parent-pin-set").value.trim();
  await setSetting("goalMinutes", goal);
  await setSetting("reminderTime", reminder);
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
    <div>Today: <strong>${stats.todayMinutes} / ${goal} min</strong></div>
  `;
}

async function exportData() {
  const sessions = await getSessions();
  const games = await getGameResults();
  const recordings = await getRecordings();
  const settings = await getAllSettings();
  const payload = { sessions, games, recordings: recordings.map((r) => ({ ...r, blob: undefined })), settings };
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
    const tx = db.transaction(["sessions", "games", "settings"], "readwrite");
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
